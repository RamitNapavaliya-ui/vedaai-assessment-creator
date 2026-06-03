/**
 * In-process BullMQ worker — runs inside the main API server.
 * This means you only need ONE terminal (npm run dev) instead of two.
 * A separate worker process (npm run worker) can still be used in production.
 */
import { Worker } from 'bullmq';
import { queueConnection } from './queue';
import { Assignment } from '../models/Assignment';
import { broadcastToAssignment } from './websocket';
import { generateAssessment, generateMockAssessment } from '../services/aiService';
import { cacheSet, getRedis } from './redis';
import { AssignmentInput, JobState, WsMessage } from '../types';

function notify(assignmentId: string, jobId: string, state: Partial<JobState>): void {
  const payload: JobState = {
    jobId,
    assignmentId,
    status: 'active',
    progress: 0,
    message: '',
    ...state,
  };
  const type: WsMessage['type'] =
    state.status === 'completed' ? 'job_complete'
    : state.status === 'failed' ? 'job_error'
    : 'job_update';

  // Broadcast directly via WebSocket (same process)
  broadcastToAssignment(assignmentId, { type, payload });

  // Also publish to Redis so any external subscribers get it
  try {
    getRedis().publish(`job:${assignmentId}`, JSON.stringify({ type, payload }));
  } catch { /* ignore */ }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export function startInProcessWorker(): void {
  const worker = new Worker(
    'assessment-generation',
    async (job) => {
      const { assignmentId, input }: { assignmentId: string; input: AssignmentInput } = job.data;
      console.log(`[Worker] Processing job ${job.id} for ${assignmentId}`);

      try {
        await Assignment.findByIdAndUpdate(assignmentId, { status: 'active', jobId: job.id });

        notify(assignmentId, job.id!, { status: 'active', progress: 15, message: 'Analyzing input...' });
        await job.updateProgress(15);
        await sleep(300);

        notify(assignmentId, job.id!, { status: 'active', progress: 35, message: 'Building prompt...' });
        await job.updateProgress(35);
        await sleep(300);

        const hasKey = process.env.OPENAI_API_KEY &&
          process.env.OPENAI_API_KEY !== 'sk-your-api-key-here';

        let paper;
        if (hasKey) {
          notify(assignmentId, job.id!, { status: 'active', progress: 55, message: 'Calling AI model...' });
          await job.updateProgress(55);
          paper = await generateAssessment(input);
        } else {
          notify(assignmentId, job.id!, { status: 'active', progress: 55, message: 'Generating (demo mode)...' });
          await job.updateProgress(55);
          await sleep(2000);
          paper = generateMockAssessment(input);
        }

        notify(assignmentId, job.id!, { status: 'active', progress: 85, message: 'Structuring paper...' });
        await job.updateProgress(85);
        await sleep(300);

        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'completed',
          generatedPaper: paper,
        });
        await cacheSet(`paper:${assignmentId}`, paper, 3600);

        notify(assignmentId, job.id!, {
          status: 'completed',
          progress: 100,
          message: 'Question paper generated!',
          result: paper,
        });

        console.log(`[Worker] ✅ Done: ${assignmentId}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Worker] ❌ Failed: ${assignmentId}`, errMsg);
        await Assignment.findByIdAndUpdate(assignmentId, { status: 'failed' });
        notify(assignmentId, job.id!, {
          status: 'failed',
          progress: 0,
          message: 'Generation failed',
          error: errMsg,
        });
        throw error;
      }
    },
    {
      connection: queueConnection,
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => console.log(`[Worker] ✅ Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message));
  worker.on('error', (err) => console.error('[Worker] Error:', err.message));

  console.log('✅ In-process worker started');
}
