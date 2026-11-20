import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/server/routes/authRoutes.ts';
import classroomRoutes from './src/server/routes/classroomRoutes.ts';
import doubtRoutes from './src/server/routes/doubtRoutes.ts';
import quizRoutes from './src/server/routes/quizRoutes.ts';
import revisionAndAiRoutes from './src/server/routes/revisionAndAiRoutes.ts';
import {
  consumeSseTicket,
  registerSseClient,
  removeSseClient,
} from './src/lib/realtime.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Real-time Server-Sent Events stream (authenticated via short-lived ticket)
  app.get('/api/events', (req, res) => {
    const ticketToken = String(req.query.ticket || '');
    const verified = consumeSseTicket(ticketToken);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired sync ticket.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = registerSseClient(verified.userId, verified.role, res);
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      removeSseClient(clientId);
    });
  });

  // Mount all API routes
  app.use('/api', authRoutes);
  app.use('/api', classroomRoutes);
  app.use('/api', doubtRoutes);
  app.use('/api', quizRoutes);
  app.use('/api', revisionAndAiRoutes);

  // Unknown API route handler
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Classroom server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Smart Classroom server:', err);
  process.exit(1);
});
