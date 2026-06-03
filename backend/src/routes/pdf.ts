import { Router, Request, Response, NextFunction } from 'express';
import { Assignment } from '../models/Assignment';
import { cacheGet } from '../lib/redis';
import { GeneratedPaper } from '../types';
import { generatePDF } from '../services/pdfService';

const router = Router();

// GET /api/pdf/:assignmentId - Download PDF
router.get('/:assignmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params;
    const { studentName = '', rollNumber = '', section = '' } = req.query as Record<string, string>;

    // Try cache first
    let paper = await cacheGet<GeneratedPaper>(`paper:${assignmentId}`);

    if (!paper) {
      const assignment = await Assignment.findById(assignmentId);
      if (!assignment || !assignment.generatedPaper) {
        return res.status(404).json({
          success: false,
          message: 'Generated paper not found',
        });
      }
      paper = assignment.generatedPaper as unknown as GeneratedPaper;
    }

    const pdfBuffer = await generatePDF(paper, studentName, rollNumber, section);

    const filename = `${paper.title.replace(/[^a-z0-9]/gi, '_')}_question_paper.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
