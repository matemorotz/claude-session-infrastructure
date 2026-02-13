import { Router } from 'express';

const router = Router();

export function createQueryRouter(persistence) {
  // Get recent sessions
  router.get('/recent', async (req, res) => {
    try {
      const sessions = await persistence.getRecentSessions();
      res.json(sessions);
    } catch (error) {
      console.error('[API] Error getting recent sessions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get session stats
  router.get('/stats', async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const sessionsDir = path.join(process.env.SESSIONS_DIR || '/var/claude-sessions', 'sessions');

      const sessions = await fs.readdir(sessionsDir).catch(() => []);
      const activeSessions = [];
      const completedSessions = [];

      for (const sid of sessions) {
        const metaPath = path.join(sessionsDir, sid, 'metadata.json');
        try {
          const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
          if (meta.status === 'active') {
            activeSessions.push(sid);
          } else {
            completedSessions.push(sid);
          }
        } catch (e) {
          // Skip invalid sessions
        }
      }

      res.json({
        total: sessions.length,
        active: activeSessions.length,
        completed: completedSessions.length,
        activeSessions,
        completedSessions: completedSessions.slice(0, 10) // Last 10
      });
    } catch (error) {
      console.error('[API] Error getting stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createQueryRouter;
