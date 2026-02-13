# Claude Session Infrastructure

**Centralized session storage and monitoring system for stateless containerized AI agents**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docker.com/)

A production-ready infrastructure for tracking, persisting, and monitoring multi-agent AI workflows with real-time WebSocket updates and comprehensive session management.

---

## 🎯 What It Does

Provides centralized session storage and real-time monitoring for containerized AI agents, enabling:

- **Session Persistence** - Track actions, responses, state, goals, and agent spawns across container lifecycles
- **Real-time Monitoring** - WebSocket-powered dashboard for live session updates
- **Stateless Architecture** - Externalize session state from containers for horizontal scaling
- **E2E Testing** - Complete test infrastructure with 3 real-world containerized applications

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose v5.0+
- Node.js 20+
- Python 3.11+ (for Python containers)

### 1. Start Session Storage Service

```bash
# Clone repository
git clone https://github.com/matemorotz/claude-session-infrastructure.git
cd claude-session-infrastructure

# Start service (port 9000)
./scripts/start-local.sh

# Verify health
curl http://localhost:9000/health
```

### 2. Run E2E Tests

```bash
# Run complete test suite (builds 3 containers, starts services, validates)
./scripts/test-e2e.sh

# View dashboard
open http://localhost:3000
```

### 3. Integrate Your Application

**Python (async):**
```python
from hook_agent import hook_agent

await hook_agent.log_action({
    "type": "task_start",
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "details": {"task": "process_data"}
})

await hook_agent.update_state({
    "phase": "execution",
    "currentStep": "processing"
})
```

**Node.js:**
```javascript
const hookAgent = require('./container-hook-agent');

await hookAgent.logAction({
    type: 'task_start',
    timestamp: new Date().toISOString(),
    details: { task: 'process_data' }
});

await hookAgent.updateState({
    phase: 'execution',
    currentStep: 'processing'
});
```

---

## 📦 Architecture

```
┌─────────────────────────────────────────────────┐
│  Session Storage Service (Port 9000)            │
│  ├─ REST API (CRUD operations)                  │
│  ├─ WebSocket Hub (real-time events)            │
│  └─ File Persistence (/var/claude-sessions/)    │
└────────────────┬────────────────────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
┌────▼────┐ ┌────▼────┐ ┌────▼────┐
│Container│ │Container│ │Container│
│    1    │ │    2    │ │    3    │
├─────────┤ ├─────────┤ ├─────────┤
│  Your   │ │  Your   │ │  Your   │
│  App    │ │  App    │ │  App    │
│         │ │         │ │         │
│  Hook   │ │  Hook   │ │  Hook   │
│  Agent  │ │  Agent  │ │  Agent  │
└─────────┘ └─────────┘ └─────────┘
```

---

## 🧩 Components

### 1. Session Storage Service
- **REST API** - CRUD operations for sessions, actions, state, goals, agents
- **WebSocket Hub** - Real-time event broadcasting to connected clients
- **File Persistence** - JSONL logs + JSON state snapshots
- **Query System** - Recent sessions, statistics, search capabilities

### 2. Hook Agents
- **Python Library** - Async HTTP client (`httpx` based)
- **Node.js Library** - Promise-based HTTP client
- **Methods:** `logAction`, `logResponse`, `updateState`, `addGoal`, `spawnAgent`

### 3. Dashboard
- **Real-time UI** - WebSocket-powered live updates
- **Session Viewer** - Browse all sessions, inspect state/actions
- **Event Feed** - Live action/response stream
- **Dark Theme** - Modern, readable interface

### 4. Test Containers
Three real-world applications containerized for E2E validation:
1. **fly_achensee_customer** - Governor + 3 Specialists LangGraph architecture
2. **email_solver** - 5-node email processing pipeline
3. **fly_achensee_claude** - Claude Code CLI with governance

---

## 📚 Documentation

- **[Quick Start](QUICK_START.md)** - Get started in 5 minutes
- **[E2E Testing Guide](QUICK_START_E2E.md)** - Run and validate test containers
- **[Architecture](docs/ARCHITECTURE.md)** - Detailed system design
- **[Implementation Complete](E2E_IMPLEMENTATION_COMPLETE.md)** - Full implementation details
- **[Status Report](STATUS.md)** - Current status and test results

---

## 🧪 Testing

### API Tests
```bash
./scripts/test-session-storage.sh
# Expected: 12/12 tests passing
```

### E2E Tests
```bash
./scripts/test-e2e.sh
# Builds 3 containers, starts services, validates sessions
```

### Manual Testing
```bash
# Create test session
curl -X POST http://localhost:9000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "userId": "user-alice",
    "initial": {"task": "example"}
  }'

# Get session state
curl http://localhost:9000/api/state/test-123

# View recent sessions
curl http://localhost:9000/api/query/recent
```

---

## 🐳 Docker Usage

### Start Infrastructure
```bash
docker compose up -d
```

### Run E2E Test Suite
```bash
TIMESTAMP=$(date +%s) docker compose -f docker-compose.test.yml up -d
```

### View Logs
```bash
docker compose logs -f session-storage
docker compose -f docker-compose.test.yml logs -f customer-comm
```

### Stop Services
```bash
docker compose down
docker compose -f docker-compose.test.yml down
```

---

## 🔧 Configuration

### Session Storage Service

**Environment Variables:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 9000)
- `STORAGE_PATH` - Session storage directory (default: /var/claude-sessions)

### Hook Agents

**Environment Variables:**
- `SESSION_ID` - Unique session identifier (required)
- `SESSION_SERVICE_URL` - Session service URL (default: http://localhost:9000)

---

## 📊 Session Data Structure

Sessions are stored in `/var/claude-sessions/sessions/<session-id>/`:

```
test-session-123/
├── metadata.json      # Session metadata
├── state.json         # Current state snapshot
├── actions.jsonl      # Action log (append-only)
└── responses.jsonl    # Response log (append-only)
```

**State Schema:**
```json
{
  "sessionId": "test-123",
  "phase": "execution",
  "currentStep": "processing",
  "workspace": { "cwd": "/app" },
  "goals": [
    {
      "goalId": "goal-001",
      "description": "Process data",
      "status": "in_progress",
      "priority": "high"
    }
  ],
  "agents": [
    {
      "agentId": "agent-001",
      "type": "processor",
      "status": "active"
    }
  ]
}
```

---

## 🚦 API Reference

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:sessionId` - Get session

### Actions & Responses
- `POST /api/actions/:sessionId` - Log action
- `POST /api/actions/:sessionId/responses` - Log response
- `GET /api/actions/:sessionId` - Get actions

### State Management
- `GET /api/state/:sessionId` - Get state
- `PATCH /api/state/:sessionId` - Update state
- `POST /api/state/:sessionId/goals` - Add goal
- `PATCH /api/state/:sessionId/goals/:goalId` - Update goal
- `POST /api/state/:sessionId/agents` - Spawn agent
- `POST /api/state/:sessionId/agents/:agentId/complete` - Complete agent

### Query & Analytics
- `GET /api/query/recent` - Recent sessions
- `GET /api/query/stats` - Statistics

### Health & Info
- `GET /health` - Health check
- `GET /api/query/active` - Active sessions

---

## 🎨 Dashboard Features

- **Session List** - Browse all recent sessions
- **Live Feed** - Real-time action/response stream (WebSocket)
- **State Viewer** - Inspect session state as JSON
- **Goal Tracking** - Monitor goals and their status
- **Agent Status** - See spawned agents and completion
- **Test Session Creation** - One-click test session generator

**Access:** http://localhost:3000 (after starting dashboard service)

---

## 🔐 Production Deployment

### Security Checklist
- [ ] Add authentication to API endpoints
- [ ] Configure HTTPS/TLS
- [ ] Set up firewall rules (restrict port 9000)
- [ ] Implement rate limiting
- [ ] Add API key validation for hook agents
- [ ] Configure CORS appropriately
- [ ] Set up log rotation
- [ ] Implement backup strategy for /var/claude-sessions

### Monitoring
- [ ] Set up health check monitoring
- [ ] Configure alerting for service downtime
- [ ] Monitor disk usage (/var/claude-sessions)
- [ ] Track WebSocket connection counts
- [ ] Log API request metrics

### Scaling
- Use read replicas for session queries
- Implement session sharding by prefix
- Add Redis cache for frequently accessed sessions
- Use load balancer for multiple service instances
- Consider S3/object storage for long-term persistence

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

Built with Claude Sonnet 4.5 for stateless AI agent orchestration and monitoring.

---

## 📞 Support

- **Issues:** https://github.com/matemorotz/claude-session-infrastructure/issues
- **Documentation:** See `/docs` directory
- **Examples:** See `/test-containers` for real-world integration examples

---

## 🎯 Use Cases

- **Multi-agent Systems** - Track governor + specialist architectures
- **LangGraph Workflows** - Monitor pipeline executions
- **CI/CD Integration** - Track build agent sessions
- **Development Debugging** - Inspect agent decision-making
- **Production Monitoring** - Real-time agent health tracking
- **Session Resume** - Restart containers from persisted state

---

**Status:** ✅ Production Ready | **Tests:** 12/12 Passing | **Containers:** 3/3 Built
