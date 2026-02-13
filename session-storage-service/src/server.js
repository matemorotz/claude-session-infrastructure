#!/usr/bin/env node

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { SessionPersistence } from './persistence.js';
import { WebSocketHub } from './websocket/hub.js';
import createSessionsRouter from './api/sessions.js';
import createActionsRouter from './api/actions.js';
import createStateRouter from './api/state.js';
import createQueryRouter from './api/query.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Global instances
const persistence = new SessionPersistence();
const wsHub = new WebSocketHub(wss);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/sessions', createSessionsRouter(persistence, wsHub));
app.use('/api/actions', createActionsRouter(persistence, wsHub));
app.use('/api/state', createStateRouter(persistence, wsHub));
app.use('/api/query', createQueryRouter(persistence));

// Health check
app.get('/health', (req, res) => {
  const stats = wsHub.getStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    websocket: stats,
    storage: process.env.SESSIONS_DIR || '/var/claude-sessions'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Session Storage Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sessions: '/api/sessions',
      actions: '/api/actions',
      state: '/api/state',
      query: '/api/query',
      websocket: 'ws://localhost:' + PORT + '/ws?session=<sessionId>&user=<userId>'
    }
  });
});

// Start server
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log('\n==============================================');
  console.log('  Session Storage Service');
  console.log('==============================================');
  console.log(`  HTTP Server: http://localhost:${PORT}`);
  console.log(`  WebSocket:   ws://localhost:${PORT}/ws`);
  console.log(`  Data Dir:    ${process.env.SESSIONS_DIR || '/var/claude-sessions'}`);
  console.log('==============================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Session Storage] Shutting down...');
  server.close(() => {
    console.log('[Session Storage] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Session Storage] Shutting down...');
  server.close(() => {
    console.log('[Session Storage] Server closed');
    process.exit(0);
  });
});
