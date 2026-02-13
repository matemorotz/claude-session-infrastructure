# Architecture Documentation

## Overview

The Claude Session Infrastructure provides centralized, file-based session persistence for multi-tenant Claude Code deployments.

## Core Principles

1. **Stateless Containers** - Docker sandboxes contain no session data
2. **Centralized Storage** - Single source of truth for all session data
3. **File-Based Persistence** - JSON files for easy debugging and portability
4. **Real-Time Updates** - WebSocket broadcasting for live monitoring
5. **Scalable Design** - Can handle multiple concurrent sessions

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Dashboard (Port 3000)                  │
│              Real-time WebSocket monitoring              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Session Storage Service (Port 9000)             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ REST API                                          │  │
│  │ - Session CRUD                                    │  │
│  │ - State management                                │  │
│  │ - Actions/Responses logging                       │  │
│  │ - Query & analytics                               │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ WebSocket Hub                                     │  │
│  │ - Real-time event broadcasting                    │  │
│  │ - Session subscriptions                           │  │
│  │ - User connections                                │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ File Persistence Layer                            │  │
│  │ /var/claude-sessions/                             │  │
│  │ ├── sessions/ (last 50)                           │  │
│  │ ├── recent/ (last 10 symlinks)                    │  │
│  │ └── index.json                                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
        ┌─────────────┴──────────────┐
        │                            │
┌───────▼────────┐          ┌────────▼───────┐
│ Docker Sandbox │          │ Docker Sandbox │
│  (Stateless)   │          │  (Stateless)   │
│                │          │                │
│ ┌────────────┐ │          │ ┌────────────┐ │
│ │ Claude Code│ │          │ │ Claude Code│ │
│ └────────────┘ │          │ └────────────┘ │
│ ┌────────────┐ │          │ ┌────────────┐ │
│ │ Hook Agent │ │          │ │ Hook Agent │ │
│ │ HTTP Client│ │          │ │ HTTP Client│ │
│ └────────────┘ │          │ └────────────┘ │
└────────────────┘          └────────────────┘
```

## Data Flow

### Session Creation

1. User/System creates session via `POST /api/sessions`
2. Session Storage Service:
   - Creates session directory structure
   - Initializes metadata.json, initial.json, state.json
   - Creates empty actions.jsonl, responses.jsonl
   - Updates index and recent symlinks
   - Broadcasts `session_created` event
3. Returns session ID and path

### Container Operation

1. Container starts with `SESSION_ID` and `SESSION_SERVICE_URL` env vars
2. Hook Agent initializes and tests connection
3. Container operations call Hook Agent functions:
   - `logAction()` → POST to `/api/actions/:sessionId`
   - `logResponse()` → POST to `/api/actions/:sessionId/responses`
   - `updateState()` → PATCH to `/api/state/:sessionId`
   - `addGoal()` → POST to `/api/state/:sessionId/goals`
   - `spawnAgent()` → POST to `/api/state/:sessionId/agents`
4. Each call triggers real-time WebSocket broadcast
5. Dashboard receives and displays updates

### Session Monitoring

1. Dashboard connects via WebSocket: `ws://localhost:9000/ws?session=<id>&user=<userId>`
2. Subscribes to session events
3. Receives real-time broadcasts:
   - `action` - New action logged
   - `response` - New response logged
   - `state_updated` - State changed
   - `goal_added` - Goal added
   - `goal_updated` - Goal status changed
   - `agent_spawned` - Agent created
   - `agent_completed` - Agent finished

## File Structure

### Session Directory

```
/var/claude-sessions/
├── sessions/
│   └── session-abc123/
│       ├── metadata.json          # Session info, metrics
│       ├── initial.json            # Initial input & config
│       ├── state.json              # Current state (live updated)
│       ├── actions.jsonl           # Append-only action log
│       ├── responses.jsonl         # Append-only response log
│       ├── final.json              # Final summary (on completion)
│       └── subsessions/            # Nested agent sessions
│           └── subsession-001/
│               └── ... (same structure)
├── recent/                         # Symlinks to last 10 sessions
│   ├── 01-session-xyz789 -> ../sessions/session-xyz789
│   └── 02-session-abc123 -> ../sessions/session-abc123
└── index.json                      # Fast lookup {sessionId: {userId, created}}
```

### JSON Schemas

**metadata.json:**
```json
{
  "$schema": "session-metadata-v1",
  "sessionId": "session-abc123",
  "userId": "user-alice",
  "sandboxId": "sandbox-alice-x7k2",
  "created": "2026-02-13T10:30:00Z",
  "updated": "2026-02-13T11:45:30Z",
  "status": "active|completed",
  "model": "claude-sonnet-4.5",
  "yoloMode": true,
  "tokenUsage": {"input": 0, "output": 0, "total": 0},
  "metrics": {
    "agentsSpawned": 0,
    "toolCalls": 0,
    "mcpCalls": 0,
    "filesModified": 0,
    "bashCommands": 0
  },
  "tags": [],
  "parentSession": null,
  "subsessions": []
}
```

**state.json:**
```json
{
  "$schema": "session-state-v1",
  "version": 14,
  "timestamp": "2026-02-13T11:45:30Z",
  "phase": "execution",
  "currentStep": "testing",
  "goals": [{
    "id": "goal-1",
    "description": "Build REST API",
    "status": "completed|in_progress|pending",
    "priority": "high|medium|low"
  }],
  "priorities": {
    "current": "goal-2",
    "queue": ["goal-3"],
    "blocked": []
  },
  "expectedOutcome": {},
  "agents": {
    "spawned": [{
      "agentId": "agent-backend-001",
      "type": "backend-dev",
      "task": "Build Express API",
      "status": "completed",
      "spawnedAt": "2026-02-13T10:32:00Z",
      "completedAt": "2026-02-13T11:15:00Z"
    }],
    "active": [],
    "completed": ["agent-backend-001"]
  },
  "mcp": {"swarm": {}, "memory": {"keys": []}},
  "workspace": {"cwd": "/workspace", "filesCreated": [], "filesModified": []},
  "errors": []
}
```

**actions.jsonl (append-only):**
```jsonl
{"seq":1,"timestamp":"2026-02-13T10:30:05Z","type":"thinking","content":"..."}
{"seq":2,"timestamp":"2026-02-13T10:30:12Z","type":"mcp_call","tool":"swarm_init"}
{"seq":3,"timestamp":"2026-02-13T10:30:15Z","type":"task_spawn","agent":"backend-dev"}
```

## API Endpoints

### Sessions

- `POST /api/sessions` - Create new session
- `GET /api/sessions/:sessionId` - Get full session data
- `GET /api/sessions/user/:userId` - List user's sessions
- `PATCH /api/sessions/:sessionId/metadata` - Update metadata
- `POST /api/sessions/:sessionId/finalize` - Mark session complete
- `DELETE /api/sessions/:sessionId` - Delete session

### State Management

- `GET /api/state/:sessionId` - Get current state
- `PATCH /api/state/:sessionId` - Update state
- `POST /api/state/:sessionId/goals` - Add goal
- `PATCH /api/state/:sessionId/goals/:goalId` - Update goal
- `POST /api/state/:sessionId/agents` - Spawn agent
- `POST /api/state/:sessionId/agents/:agentId/complete` - Mark agent complete

### Actions & Responses

- `POST /api/actions/:sessionId` - Log action
- `GET /api/actions/:sessionId?limit=N` - Get actions
- `POST /api/actions/:sessionId/responses` - Log response

### Query & Analytics

- `GET /api/query/recent` - Get last 10 sessions
- `GET /api/query/stats` - System statistics

### WebSocket

- `ws://localhost:9000/ws?session=<id>&user=<userId>` - Subscribe to events

## Scaling Considerations

### Current Design (Single Instance)

- ✅ Up to 50 concurrent sessions
- ✅ File-based storage (portable, debuggable)
- ✅ Single server handles all requests
- ⚠️ No horizontal scaling yet

### Future Enhancements

1. **Multi-Server Deployment:**
   - Shared NFS volume for `/var/claude-sessions`
   - Redis pub/sub for WebSocket coordination
   - Load balancer in front of session storage instances

2. **Database Backend:**
   - PostgreSQL for metadata and state
   - Keep JSONL files for action/response logs
   - Hybrid approach: DB for queries, files for replay

3. **Sharding:**
   - Shard by userId or sessionId
   - Multiple session storage instances
   - Router layer for request distribution

## Security

### Current Implementation

- ✅ No authentication (internal service)
- ✅ CORS enabled for dashboard
- ✅ Input validation on all endpoints
- ✅ File path sanitization

### Production Requirements

- [ ] Add API key authentication
- [ ] Rate limiting per user
- [ ] Encrypt sensitive data in storage
- [ ] Audit logging
- [ ] Role-based access control

## Performance

### Benchmarks (Expected)

- Session creation: < 50ms
- Action logging: < 10ms (append-only)
- State update: < 30ms (JSON read/write)
- Query recent: < 20ms (symlink read)
- WebSocket broadcast: < 5ms per client

### Optimization Strategies

1. **Caching:**
   - In-memory cache for active session states
   - Cache invalidation on updates
   - TTL-based expiry

2. **Batch Operations:**
   - Bulk action logging
   - Batch WebSocket broadcasts

3. **Compression:**
   - Gzip old session files
   - Archive completed sessions

## Monitoring

### Health Metrics

- Total sessions
- Active sessions
- WebSocket connections
- Disk usage
- API response times

### Logging

- Request logs: `[API] METHOD /path`
- WebSocket logs: `[WebSocket] Event: type`
- Error logs: `[API] Error: message`

### Alerts

- Disk usage > 80%
- Session count > 45
- API errors > 5/min
- WebSocket disconnects > 10/min

## Backup & Recovery

### Backup Strategy

1. **Continuous:**
   - All data in `/var/claude-sessions`
   - Daily incremental backups
   - Weekly full backups

2. **Restore:**
   - Stop service
   - Restore `/var/claude-sessions`
   - Start service
   - Rebuild index if needed

### Disaster Recovery

- RPO (Recovery Point Objective): 1 hour
- RTO (Recovery Time Objective): 15 minutes
- Backup location: S3 or NFS backup server

## Development Workflow

1. **Local Development:**
   ```bash
   # Start service
   cd session-storage-service
   npm start

   # Test
   ./scripts/test-session-storage.sh

   # View dashboard
   open http://localhost:3000
   ```

2. **Docker Development:**
   ```bash
   # Start infrastructure
   docker-compose up -d

   # Watch logs
   docker-compose logs -f session-storage

   # Restart after code changes
   docker-compose restart session-storage
   ```

3. **Testing:**
   ```bash
   # Unit tests
   npm test

   # Integration tests
   ./scripts/test-session-storage.sh

   # Load tests
   ./scripts/load-test.sh
   ```

## Future Roadmap

### Phase 1 (Current)
- ✅ File-based persistence
- ✅ REST API
- ✅ WebSocket real-time updates
- ✅ Dashboard

### Phase 2
- [ ] Session Manager implementation
- [ ] Container integration
- [ ] Test containers (fly_achensee_customer, fly_achensee_claude)

### Phase 3
- [ ] Multi-server support
- [ ] Database backend option
- [ ] Authentication & authorization
- [ ] Advanced analytics

### Phase 4
- [ ] Auto-scaling
- [ ] ML-based insights
- [ ] Session replay & debugging tools
- [ ] Export/import functionality
