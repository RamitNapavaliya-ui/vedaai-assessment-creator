import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { WsMessage } from '../types';

interface ClientInfo {
  ws: WebSocket;
  assignmentId?: string;
}

let wss: WebSocketServer | null = null;
const clients = new Map<string, ClientInfo>();

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://localhost`);
    const clientId = url.searchParams.get('clientId') || Math.random().toString(36).slice(2);
    const assignmentId = url.searchParams.get('assignmentId') || undefined;

    clients.set(clientId, { ws, assignmentId });
    console.log(`WS client connected: ${clientId}, assignmentId: ${assignmentId}`);

    ws.send(JSON.stringify({ type: 'connected', clientId }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' && msg.assignmentId) {
          const info = clients.get(clientId);
          if (info) {
            info.assignmentId = msg.assignmentId;
            clients.set(clientId, info);
          }
        }
      } catch {
        // ignore invalid messages
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`WS client disconnected: ${clientId}`);
    });

    ws.on('error', (err) => {
      console.error(`WS error for ${clientId}:`, err.message);
      clients.delete(clientId);
    });
  });

  console.log('✅ WebSocket server initialized');
}

export function broadcastToAssignment(assignmentId: string, message: WsMessage): void {
  const payload = JSON.stringify(message);
  let sent = 0;

  for (const [, client] of clients) {
    if (
      client.assignmentId === assignmentId &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(payload);
      sent++;
    }
  }

  console.log(`WS broadcast to ${assignmentId}: ${message.type} (${sent} clients)`);
}

export function broadcastToAll(message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const [, client] of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}
