import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes';
import { getDatabase, initializeDatabase } from './src/server/db';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Body parser
  app.use(express.json({ limit: '10mb' }));

  // Initialize SQLite Database with Schema and Seed Data
  const db = getDatabase();
  await initializeDatabase(db);
  console.log('[IRON Backend] Database initialized and seeded successfully.');

  // Mount API Router
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Setup Vite development server middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IRON Backend] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[IRON Backend] Fatal error during server startup:', err);
  process.exit(1);
});
