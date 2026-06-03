/**
 * Standalone BullMQ worker — run separately with: npm run worker
 * Only needed when Redis is available. In dev without Redis,
 * the inline worker (inlineWorker.ts) handles jobs automatically.
 */
import dotenv from 'dotenv';
dotenv.config();

import { Worker } from 'bullmq';
import { queueConnection } from '../lib/queue';
import { connectDatabase } from '../lib/database';
import { initRedis, getRedis, cacheSet } from '../lib/redis';
import { Assignment } from '../models/Assignment';
import { generateAssessment, generateMockAssessment } from '../services/aiService';
import { AssignmentInput, JobState, WsMessage } from '../types';

async function publishUpdate(assignmentId: string, message: WsMessage): Promise<void> {
  try {
    await getRedis().publish(`job:${assignmentId}`, JSON.stringify(message));
  } catch { /* ignore if pub/sub unavailable */ }
}

async function processJob(job: any): Promise<void> {
  const { assignmentId, input }: { assignmentId: string; input: AssignmentInput } = job.data;

  const notify = (state: Partial<JobState>) => {
    const payload: JobState = { jobId: job.id, assignmentId, status: 'active', progress: 0, message: '', ...state };
    const type: WsMessage['type'] = state.status === 'completed' ? 'job_complete' : state.status === 'failed' ? 'job_error' : 'job_update';
    publishUpdate(assignmentId, { type, payload });
  };

  try {
    await Assignment.findByIdAndUpdate(assignmentId, { status: 'active', jobId: job.id });
    notify({ progress: 15, message: 'Analyzing input...' });
    await job.updateProgress(15);

    notify({ progress: 35, message: 'Building prompt...' });
    await job.updateProgress(35);

    const hasKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-api-key-here';
    let paper;

    if (hasKey) {
      notify({ progress: 55, message: 'Calling AI model...' });
      await job.updateProgress(55);
      paper = await generateAssessment(input);
    } else {
      notify({ progress: 55, message: 'Generating (demo mode)...' });
      await job.updateProgress(55);
      await new Promise(r => setTimeout(r, 1800));
      paper = generateMockAssessment(input);
    }

    notify({ progress: 85, message: 'Structuring paper...' });
    await job.updateProgress(85);

    await Assignment.findByIdAndUpdate(assignmentId, { status: 'completed', generatedPaper: paper });
    await cacheSet(`paper:${assignmentId}`, paper, 3600);

    publishUpdate(assignmentId, {
      type: 'job_complete',
      payload: { jobId: job.id, assignmentId, status: 'completed', progress: 100, message: 'Done!', result: paper },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    await Assignment.findByIdAndUpdate(assignmentId, { status: 'failed' });
    publishUpdate(assignmentId, {
      type: 'job_error',
      payload: { jobId: job.id, assignmentId, status: 'failed', progress: 0, message: 'Failed', error: errMsg },
    });
    throw error;
  }
}

async function start(): Promise<void> {
  await initRedis();
  await connectDatabase();

  const worker = new Worker('assessment-generation', processJob, {
    connection: queueConnection,
    concurrency: 3,
  });

  worker.on('completed', j => console.log(`✅ Job ${j.id} done`));
  worker.on('failed', (j, e) => console.error(`❌ Job ${j?.id} failed:`, e.message));
  console.log('✅ BullMQ worker running');

  process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
  process.on('SIGINT', async () => { await worker.close(); process.exit(0); });
}

start().catch(console.error);
