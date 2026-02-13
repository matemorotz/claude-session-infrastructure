import { Router } from 'express';

const router = Router();

export function createActionsRouter(persistence, wsHub) {
  // Append action
  router.post('/:sessionId', async (req, res) => {
    try {
      await persistence.appendAction(req.params.sessionId, req.body);

      // Real-time broadcast
      wsHub.broadcastToSession(req.params.sessionId, 'action', req.body);

      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error appending action:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get actions
  router.get('/:sessionId', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      const actions = await persistence.getActions(req.params.sessionId, limit);
      res.json(actions);
    } catch (error) {
      console.error('[API] Error getting actions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Append response
  router.post('/:sessionId/responses', async (req, res) => {
    try {
      await persistence.appendResponse(req.params.sessionId, req.body);

      // Real-time broadcast
      wsHub.broadcastToSession(req.params.sessionId, 'response', req.body);

      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error appending response:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createActionsRouter;
