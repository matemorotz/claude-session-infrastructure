import { Router } from 'express';

const router = Router();

export function createSessionsRouter(persistence, wsHub) {
  // Create new session
  router.post('/', async (req, res) => {
    try {
      const { sessionId, userId, initial } = req.body;

      if (!sessionId || !userId || !initial) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const sessionDir = await persistence.createSession(sessionId, userId, initial);

      wsHub.broadcast('session_created', { sessionId, userId });

      res.json({ success: true, sessionId, path: sessionDir });
    } catch (error) {
      console.error('[API] Error creating session:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get session
  router.get('/:sessionId', async (req, res) => {
    try {
      const session = await persistence.restoreSession(req.params.sessionId);
      res.json(session);
    } catch (error) {
      console.error('[API] Error getting session:', error);
      res.status(404).json({ error: 'Session not found' });
    }
  });

  // List sessions by user
  router.get('/user/:userId', async (req, res) => {
    try {
      const sessions = await persistence.getSessionsByUser(req.params.userId);
      res.json(sessions);
    } catch (error) {
      console.error('[API] Error listing sessions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update session metadata
  router.patch('/:sessionId/metadata', async (req, res) => {
    try {
      await persistence.updateMetadata(req.params.sessionId, req.body);
      wsHub.broadcastToSession(req.params.sessionId, 'metadata_updated', req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error updating metadata:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Finalize session
  router.post('/:sessionId/finalize', async (req, res) => {
    try {
      await persistence.finalizeSession(req.params.sessionId, req.body);
      wsHub.broadcastToSession(req.params.sessionId, 'session_finalized', req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error finalizing session:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete session
  router.delete('/:sessionId', async (req, res) => {
    try {
      await persistence.deleteSession(req.params.sessionId);
      wsHub.broadcast('session_deleted', { sessionId: req.params.sessionId });
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error deleting session:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createSessionsRouter;
