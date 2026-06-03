/**
 * Inline worker — runs assessment generation in the same process
 * when Redis/BullMQ is unavailable (dev / no-docker mode).
 * Uses the same logic as the BullMQ worker but notifies via WebSocket directly.
 */
import { Assignment } from '../models/Assignment';
import { broadcastToAssignment } from '../lib/websocket';
import { generateAssessment, generateMockAssessment } from '../services/aiService';
import { cacheSet } from '../lib/redis';
import { AssignmentInput, JobState, WsMessage } from '../types';

function notify(assignmentId: string, state: Partial<JobState>): void {
  const payload: JobState = {
    jobId: `inline-${assignmentId}`,
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

  broadcastToAssignment(assignmentId, { type, payload });
}

export async function runJobInline(assignmentId: string, input: AssignmentInput): Promise<void> {
  console.log(`[InlineWorker] Starting job for ${assignmentId}`);

  try {
    await Assignment.findByIdAndUpdate(assignmentId, { status: 'active' });
    notify(assignmentId, { status: 'active', progress: 15, message: 'Analyzing input...' });

    await sleep(400);
    notify(assignmentId, { status: 'active', progress: 35, message: 'Building prompt...' });

    let paper;
    const hasKey = process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== 'sk-your-api-key-here';

    if (hasKey) {
      notify(assignmentId, { status: 'active', progress: 50, message: 'Calling AI model...' });
      paper = await generateAssessment(input);
    } else {
      notify(assignmentId, { status: 'active', progress: 50, message: 'Generating (demo mode)...' });
      await sleep(1800);
      paper = generateMockAssessment(input);
    }

    notify(assignmentId, { status: 'active', progress: 85, message: 'Structuring paper...' });
    await sleep(300);

    await Assignment.findByIdAndUpdate(assignmentId, {
      status: 'completed',
      generatedPaper: paper,
    });
    await cacheSet(`paper:${assignmentId}`, paper, 3600);

    broadcastToAssignment(assignmentId, {
      type: 'job_complete',
      payload: {
        jobId: `inline-${assignmentId}`,
        assignmentId,
        status: 'completed',
        progress: 100,
        message: 'Question paper generated!',
        result: paper,
      },
    });

    console.log(`[InlineWorker] ✅ Done for ${assignmentId}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[InlineWorker] ❌ Failed for ${assignmentId}:`, errMsg);

    await Assignment.findByIdAndUpdate(assignmentId, { status: 'failed' });
    broadcastToAssignment(assignmentId, {
      type: 'job_error',
      payload: {
        jobId: `inline-${assignmentId}`,
        assignmentId,
        status: 'failed',
        progress: 0,
        message: 'Generation failed',
        error: errMsg,
      },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
