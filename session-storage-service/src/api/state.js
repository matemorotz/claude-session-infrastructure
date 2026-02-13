import { Router } from 'express';

const router = Router();

export function createStateRouter(persistence, wsHub) {
  // Get current state
  router.get('/:sessionId', async (req, res) => {
    try {
      const state = await persistence.getState(req.params.sessionId);
      res.json(state);
    } catch (error) {
      console.error('[API] Error getting state:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update state
  router.patch('/:sessionId', async (req, res) => {
    try {
      await persistence.updateState(req.params.sessionId, req.body);

      // Broadcast state update
      wsHub.broadcastToSession(req.params.sessionId, 'state_updated', req.body);

      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error updating state:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add goal
  router.post('/:sessionId/goals', async (req, res) => {
    try {
      await persistence.addGoal(req.params.sessionId, req.body);
      wsHub.broadcastToSession(req.params.sessionId, 'goal_added', req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error adding goal:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update goal
  router.patch('/:sessionId/goals/:goalId', async (req, res) => {
    try {
      await persistence.updateGoal(req.params.sessionId, req.params.goalId, req.body);
      wsHub.broadcastToSession(req.params.sessionId, 'goal_updated', {
        goalId: req.params.goalId,
        ...req.body
      });
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error updating goal:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Spawn agent
  router.post('/:sessionId/agents', async (req, res) => {
    try {
      const agent = await persistence.spawnAgent(req.params.sessionId, req.body);
      wsHub.broadcastToSession(req.params.sessionId, 'agent_spawned', agent);
      res.json(agent);
    } catch (error) {
      console.error('[API] Error spawning agent:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Complete agent
  router.post('/:sessionId/agents/:agentId/complete', async (req, res) => {
    try {
      await persistence.completeAgent(req.params.sessionId, req.params.agentId);
      wsHub.broadcastToSession(req.params.sessionId, 'agent_completed', {
        agentId: req.params.agentId
      });
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error completing agent:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createStateRouter;
