import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import { Assignment } from '../models/Assignment';
import { assessmentQueue } from '../lib/queue';
import { cacheGet } from '../lib/redis';
import { GeneratedPaper, AssignmentInput } from '../types';
import pdfParse from 'pdf-parse';
import { runJobInline } from '../workers/inlineWorker';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['application/pdf', 'text/plain'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and text files allowed'));
  },
});

const validateAssignment = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('gradeLevel').trim().notEmpty().withMessage('Grade level is required'),
  body('dueDate').notEmpty().withMessage('Due date required').custom((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) throw new Error('Valid due date required');
    return true;
  }),
  body('totalQuestions').isInt({ min: 1, max: 100 }).withMessage('Questions must be 1–100'),
  body('totalMarks').isInt({ min: 1 }).withMessage('Total marks must be at least 1'),
];

async function enqueueOrInline(assignmentId: string, input: AssignmentInput): Promise<string> {
  try {
    if (assessmentQueue) {
      const job = await assessmentQueue.add('generate-assessment', { assignmentId, input }, {
        jobId: `assess-${assignmentId}-${Date.now()}`,
      });
      return job.id || assignmentId;
    }
  } catch { /* fall through to inline */ }

  // Run inline (no Redis/BullMQ) — non-blocking
  setImmediate(() => runJobInline(assignmentId, input));
  return `inline-${assignmentId}`;
}

// POST /api/assignments
router.post('/', upload.single('file'), validateAssignment,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      let uploadedFileContent: string | undefined;
      if (req.file) {
        if (req.file.mimetype === 'application/pdf') {
          const parsed = await pdfParse(req.file.buffer);
          uploadedFileContent = parsed.text.slice(0, 5000);
        } else {
          uploadedFileContent = req.file.buffer.toString('utf-8').slice(0, 5000);
        }
      }

      const b = req.body;

      // questionTypes comes as JSON string from FormData
      let questionTypes: string[] = [];
      try {
        const raw = b.questionTypes;
        if (Array.isArray(raw)) {
          questionTypes = raw;
        } else if (typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          questionTypes = Array.isArray(parsed) ? parsed : [parsed];
        }
      } catch {
        questionTypes = [];
      }

      if (questionTypes.length === 0) {
        return res.status(400).json({
          success: false,
          errors: [{ msg: 'Select at least one question type', path: 'questionTypes' }],
        });
      }

      const assignment = await Assignment.create({
        title: b.title, subject: b.subject, gradeLevel: b.gradeLevel,
        dueDate: new Date(b.dueDate), questionTypes,
        totalQuestions: parseInt(b.totalQuestions),
        totalMarks: parseInt(b.totalMarks),
        additionalInstructions: b.additionalInstructions,
        uploadedFileContent, duration: b.duration || '3 hours',
        status: 'waiting',
      });

      const input: AssignmentInput = {
        title: b.title, subject: b.subject, gradeLevel: b.gradeLevel,
        dueDate: b.dueDate, questionTypes,
        totalQuestions: parseInt(b.totalQuestions),
        totalMarks: parseInt(b.totalMarks),
        additionalInstructions: b.additionalInstructions,
        uploadedFileContent, duration: b.duration || '3 hours',
      };

      const jobId = await enqueueOrInline(assignment._id.toString(), input);
      await Assignment.findByIdAndUpdate(assignment._id, { jobId });

      return res.status(201).json({
        success: true,
        data: { assignmentId: assignment._id.toString(), jobId, status: 'waiting' },
      });
    } catch (err) { next(err); }
  }
);

// GET /api/assignments
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const [assignments, total] = await Promise.all([
      Assignment.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .select('-uploadedFileContent -generatedPaper'),
      Assignment.countDocuments(),
    ]);
    return res.json({ success: true, data: assignments, pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

// GET /api/assignments/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cached = await cacheGet<GeneratedPaper>(`paper:${req.params.id}`);
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({
      success: true,
      data: { ...assignment.toObject(), generatedPaper: cached || assignment.generatedPaper, fromCache: !!cached },
    });
  } catch (err) { next(err); }
});

// GET /api/assignments/:id/status
router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await Assignment.findById(req.params.id).select('status jobId generatedPaper');
    if (!assignment) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({
      success: true,
      data: { assignmentId: req.params.id, status: assignment.status, hasResult: !!assignment.generatedPaper },
    });
  } catch (err) { next(err); }
});

// POST /api/assignments/:id/regenerate
router.post('/:id/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Not found' });

    await Assignment.findByIdAndUpdate(req.params.id, { status: 'waiting', generatedPaper: null });

    const input: AssignmentInput = {
      title: assignment.title, subject: assignment.subject, gradeLevel: assignment.gradeLevel,
      dueDate: assignment.dueDate.toISOString(),
      questionTypes: assignment.questionTypes as any,
      totalQuestions: assignment.totalQuestions, totalMarks: assignment.totalMarks,
      additionalInstructions: assignment.additionalInstructions,
      uploadedFileContent: assignment.uploadedFileContent,
      duration: assignment.duration,
    };

    const jobId = await enqueueOrInline(req.params.id, input);
    return res.json({ success: true, data: { assignmentId: req.params.id, jobId, status: 'waiting' } });
  } catch (err) { next(err); }
});

export default router;
