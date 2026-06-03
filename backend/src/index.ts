import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { connectDatabase } from './lib/database';
import { initWebSocket, broadcastToAssignment } from './lib/websocket';
import { initRedis, getSubscriber } from './lib/redis';
import { initQueue } from './lib/queue';
import { startInProcessWorker } from './lib/inProcessWorker';
import assignmentRoutes from './routes/assignments';
import pdfRoutes from './routes/pdf';
import { WsMessage } from './types';

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/assignments', assignmentRoutes);
app.use('/api/pdf', pdfRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

async function bootstrap(): Promise<void> {
  // Init in order: Redis → DB → Queue → WebSocket
  await initRedis();
  await connectDatabase();
  await initQueue();
  startInProcessWorker();
  initWebSocket(server);

  // Subscribe to worker job-update events via Redis pub/sub
  try {
    const sub = getSubscriber();
    await sub.psubscribe('job:*');
    sub.on('pmessage', (_pattern: string, channel: string, message: string) => {
      try {
        const assignmentId = channel.replace('job:', '');
        const wsMessage: WsMessage = JSON.parse(message);
        broadcastToAssignment(assignmentId, wsMessage);
      } catch { /* ignore */ }
    });
    console.log('✅ Redis pub/sub ready');
  } catch {
    console.log('⚠️  Redis pub/sub not available — WebSocket updates via polling only');
  }

  const PORT = parseInt(process.env.PORT || '4000');
  server.listen(PORT, () => {
    console.log(`\n🚀 VedaAI Backend running → http://localhost:${PORT}`);
    console.log(`📡 WebSocket            → ws://localhost:${PORT}/ws`);
    console.log(`🌍 Mode                 → ${process.env.NODE_ENV || 'development'}\n`);
  });

  const shutdown = async () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
