'use client';

import { JobState } from '@/types';

type MessageHandler = (state: JobState) => void;

export class AssessmentWebSocket {
  private ws: WebSocket | null = null;
  private assignmentId: string;
  private clientId: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private reconnectDelay = 2000;
  private shouldReconnect = true;

  constructor(assignmentId: string) {
    this.assignmentId = assignmentId;
    this.clientId = Math.random().toString(36).slice(2);
  }

  connect(): void {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
    const url = `${WS_URL}/ws?clientId=${this.clientId}&assignmentId=${this.assignmentId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WS connected for assignment:', this.assignmentId);
        this.reconnectAttempts = 0;
        // Subscribe to this assignment
        this.ws?.send(
          JSON.stringify({ type: 'subscribe', assignmentId: this.assignmentId })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'connected') return;

          const handlers = this.handlers.get(message.type) || [];
          handlers.forEach((h) => h(message.payload));

          // Also call 'any' handlers
          const anyHandlers = this.handlers.get('*') || [];
          anyHandlers.forEach((h) => h(message.payload));
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onclose = () => {
        console.log('WS disconnected');
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnects) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`WS reconnect attempt ${this.reconnectAttempts}`);
            this.connect();
          }, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
        }
      };

      this.ws.onerror = (err) => {
        console.error('WS error:', err);
      };
    } catch (err) {
      console.error('WS connection failed:', err);
    }
  }

  on(event: string, handler: MessageHandler): () => void {
    const existing = this.handlers.get(event) || [];
    this.handlers.set(event, [...existing, handler]);

    // Return unsubscribe function
    return () => {
      const current = this.handlers.get(event) || [];
      this.handlers.set(
        event,
        current.filter((h) => h !== handler)
      );
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }
}
