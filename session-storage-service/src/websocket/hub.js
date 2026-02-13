export class WebSocketHub {
  constructor(wss) {
    this.wss = wss;
    this.connections = new Map(); // userId -> Set<WebSocket>
    this.sessionSubscriptions = new Map(); // sessionId -> Set<WebSocket>

    wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('[WebSocket Hub] Initialized');
  }

  handleConnection(ws, req) {
    const url = new URL(req.url, 'http://localhost');
    const userId = url.searchParams.get('user');
    const sessionId = url.searchParams.get('session');

    console.log(`[WebSocket] Connection: user=${userId}, session=${sessionId}`);

    // Track by user
    if (userId) {
      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }
      this.connections.get(userId).add(ws);
    }

    // Subscribe to session
    if (sessionId) {
      if (!this.sessionSubscriptions.has(sessionId)) {
        this.sessionSubscriptions.set(sessionId, new Set());
      }
      this.sessionSubscriptions.get(sessionId).add(ws);
    }

    ws.on('close', () => {
      console.log(`[WebSocket] Disconnect: user=${userId}, session=${sessionId}`);
      if (userId) {
        this.connections.get(userId)?.delete(ws);
      }
      if (sessionId) {
        this.sessionSubscriptions.get(sessionId)?.delete(ws);
      }
    });

    // Send connected event
    ws.send(JSON.stringify({
      type: 'connected',
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    }));
  }

  // Broadcast to all subscribers of a session
  broadcastToSession(sessionId, type, data) {
    const subscribers = this.sessionSubscriptions.get(sessionId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({
      type,
      sessionId,
      data,
      timestamp: new Date().toISOString()
    });

    let sent = 0;
    for (const ws of subscribers) {
      if (ws.readyState === 1) { // OPEN
        ws.send(message);
        sent++;
      }
    }

    console.log(`[WebSocket] Broadcast to session ${sessionId}: ${type} (${sent} clients)`);
  }

  // Broadcast to all users
  broadcast(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    });

    let sent = 0;
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
        sent++;
      }
    });

    console.log(`[WebSocket] Broadcast: ${type} (${sent} clients)`);
  }

  // Send to specific user
  sendToUser(userId, type, data) {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;

    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    });

    let sent = 0;
    for (const ws of userConnections) {
      if (ws.readyState === 1) {
        ws.send(message);
        sent++;
      }
    }

    console.log(`[WebSocket] Send to user ${userId}: ${type} (${sent} clients)`);
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.wss.clients.size,
      users: this.connections.size,
      sessions: this.sessionSubscriptions.size
    };
  }
}
