# Quick Start Guide

## 🚀 Infrastructure is Ready!

The centralized session storage infrastructure is **fully operational** and tested.

---

## Current Status

✅ **Session Storage Service** - Running on http://localhost:9000
✅ **REST API** - All 12 endpoints tested and working
✅ **WebSocket Hub** - Real-time event broadcasting ready
✅ **File Persistence** - Sessions saved to /var/claude-sessions/
✅ **Container Hook Agent** - Library ready for integration
✅ **Dashboard UI** - Built and ready (needs nginx)

---

## Try It Now

### 1. Check Service Health

```bash
curl http://localhost:9000/health | jq .
```

**Expected output:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "websocket": {
    "totalConnections": 0,
    "users": 0,
    "sessions": 0
  },
  "storage": "/var/claude-sessions"
}
```

### 2. View Recent Sessions

```bash
curl http://localhost:9000/api/query/recent | jq .
```

### 3. Create a Test Session

```bash
SESSION_ID="demo-$(date +%s)"

curl -X POST http://localhost:9000/api/sessions \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"${SESSION_ID}\",
    \"userId\": \"demo-user\",
    \"initial\": {
      \"source\": {\"type\": \"manual\"},
      \"input\": {\"content\": \"Demo session\"},
      \"config\": {\"model\": \"sonnet\"}
    }
  }" | jq .

echo "Created session: ${SESSION_ID}"
```

### 4. Add a Goal

```bash
curl -X POST http://localhost:9000/api/state/${SESSION_ID}/goals \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test goal tracking",
    "priority": "high"
  }' | jq .
```

### 5. Spawn an Agent

```bash
curl -X POST http://localhost:9000/api/state/${SESSION_ID}/agents \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test-agent",
    "task": "Demonstrate agent spawning"
  }' | jq .
```

### 6. View Session State

```bash
curl http://localhost:9000/api/state/${SESSION_ID} | jq .
```

---

## Use with Containers

### Setup (in your container or script)

```javascript
import hookAgent from './container-hook-agent/index.js';

// Set environment variables
process.env.SESSION_ID = 'your-session-id';
process.env.SESSION_SERVICE_URL = 'http://localhost:9000';

// Test connection
const connected = await hookAgent.testConnection();
console.log('Connected:', connected);
```

### Log Actions

```javascript
// Log any action
await hookAgent.logAction({
  type: 'file_write',
  path: 'src/app.js',
  lines: 150
});

await hookAgent.logAction({
  type: 'bash_exec',
  command: 'npm install express',
  exitCode: 0
});
```

### Manage Goals

```javascript
// Add goal
await hookAgent.addGoal({
  description: 'Implement user authentication',
  priority: 'high'
});

// Update goal
await hookAgent.updateGoal('goal-1', {
  status: 'completed'
});
```

### Spawn Agents

```javascript
// Spawn agent
const agent = await hookAgent.spawnAgent({
  type: 'backend-dev',
  task: 'Build REST API with Express'
});

console.log('Agent spawned:', agent.agentId);

// Later, mark complete
await hookAgent.completeAgent(agent.agentId);
```

### Update State

```javascript
// Update phase
await hookAgent.updateState({
  phase: 'testing',
  currentStep: 'unit-tests'
});
```

---

## View Sessions

### Check File System

```bash
# List all sessions
ls -lah /var/claude-sessions/sessions/

# View session metadata
cat /var/claude-sessions/sessions/SESSION_ID/metadata.json | jq .

# View current state
cat /var/claude-sessions/sessions/SESSION_ID/state.json | jq .

# View actions log
cat /var/claude-sessions/sessions/SESSION_ID/actions.jsonl

# View responses log
cat /var/claude-sessions/sessions/SESSION_ID/responses.jsonl
```

### Recent Sessions (Symlinks)

```bash
# Recent 10 sessions (symlinks)
ls -lah /var/claude-sessions/recent/
```

---

## Start Dashboard (Optional)

### With Docker Compose

```bash
cd /root/software/claude-session-infrastructure
docker-compose up -d dashboard
```

Then open: **http://localhost:3000**

### Or manually with nginx

```bash
# Install nginx if needed
sudo apt-get install nginx -y

# Copy dashboard files
sudo cp dashboard/index.html /var/www/html/
sudo cp dashboard/styles.css /var/www/html/

# Start nginx
sudo systemctl start nginx
```

Open: **http://localhost**

---

## WebSocket Connection

### JavaScript Example

```javascript
const ws = new WebSocket('ws://localhost:9000/ws?session=SESSION_ID&user=USER_ID');

ws.onopen = () => {
  console.log('Connected to session storage');
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Event:', msg.type, msg.data);
};

// Will receive:
// - action (new action logged)
// - response (new response logged)
// - state_updated (state changed)
// - goal_added (goal added)
// - agent_spawned (agent created)
// etc.
```

---

## Common Tasks

### Resume a Session

```bash
# Get session details
curl http://localhost:9000/api/sessions/SESSION_ID | jq .

# View state to understand where we were
curl http://localhost:9000/api/state/SESSION_ID | jq .

# Continue by updating state
curl -X PATCH http://localhost:9000/api/state/SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{"phase":"resumed"}' | jq .
```

### Debug a Session

```bash
# Get all actions
curl "http://localhost:9000/api/actions/SESSION_ID?limit=100" | jq .

# See what agents did
curl http://localhost:9000/api/state/SESSION_ID | jq '.agents'

# Check for errors
curl http://localhost:9000/api/state/SESSION_ID | jq '.errors'
```

### Delete a Session

```bash
curl -X DELETE http://localhost:9000/api/sessions/SESSION_ID | jq .
```

---

## Run Full Test Suite

```bash
cd /root/software/claude-session-infrastructure
./scripts/test-session-storage.sh
```

**Expected:** All 12 tests pass ✅

---

## Stop Service

```bash
# Find and kill the process
pkill -f "node src/server.js"

# Or if you know the PID
kill <PID>
```

---

## Restart Service

```bash
cd /root/software/claude-session-infrastructure/session-storage-service
npm start
```

Or run in background:
```bash
npm start > /tmp/session-storage.log 2>&1 &
```

---

## Next Steps

### Phase 2: Configure Test Containers

1. **Container 1:** fly_achensee_customer
   - Link to `/root/software/fly_achensee_customer/`
   - Configure for customer communication workflows

2. **Container 2:** fly_achensee_claude
   - Create new test workspace
   - Configure for general Claude work

### Integration Testing

- Launch containers with SESSION_ID env var
- Verify hook agent connects
- Monitor in real-time via dashboard
- Test session persistence across container restarts

---

## Troubleshooting

### Service won't start

```bash
# Check if port 9000 is in use
lsof -i :9000

# Check logs
tail -f /tmp/session-storage.log
```

### Can't connect to service

```bash
# Test locally
curl http://localhost:9000/health

# Check firewall
sudo ufw status

# Check if service is running
ps aux | grep "node src/server.js"
```

### WebSocket not connecting

```bash
# Test WebSocket
wscat -c ws://localhost:9000/ws

# Check if WebSocket is enabled
curl -I http://localhost:9000
```

---

## Documentation

- **README.md** - Project overview
- **STATUS.md** - Current status and progress
- **ARCHITECTURE.md** - Detailed architecture documentation
- **docs/** - Additional documentation

---

## Support

**Service Running:** ✅ http://localhost:9000
**Test Session:** ✅ test-1771012854
**Data Directory:** ✅ /var/claude-sessions/
**All Tests:** ✅ Passing (12/12)

**You're ready to build test containers!** 🚀
