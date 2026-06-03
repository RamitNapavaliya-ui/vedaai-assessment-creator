import { Queue, Worker, QueueEvents } from 'bullmq';

// BullMQ connection config — points at same Redis as the rest of the app
export const queueConnection = {
  host: (() => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try { return new URL(url).hostname; } catch { return 'localhost'; }
  })(),
  port: (() => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try { return parseInt(new URL(url).port || '6379'); } catch { return 6379; }
  })(),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 2000,
  lazyConnect: true,
};

export let assessmentQueue: Queue;

export async function initQueue(): Promise<void> {
  assessmentQueue = new Queue('assessment-generation', {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  // Test connection — if Redis isn't available BullMQ will throw
  try {
    await assessmentQueue.getJobCounts();
    console.log('✅ BullMQ queue ready');
  } catch {
    console.log('⚠️  BullMQ queue unavailable (Redis mock) — jobs will run inline');
  }
}

export { Worker };
