# Quick Start: E2E Test Containers

**Last Updated:** 2026-02-13
**Implementation:** COMPLETE ✅

---

## TL;DR - Run the Test

```bash
cd /root/software/claude-session-infrastructure
./scripts/test-e2e.sh
```

That's it! The script will:
- ✅ Verify session storage service is running
- ✅ Build all 3 containers
- ✅ Start services with unique session IDs
- ✅ Display logs and status
- ✅ Show dashboard URL

---

## What Gets Tested

### Container 1: fly_achensee_customer
- **Type:** Governor + 3 Specialists LangGraph
- **Entry:** `python -m src.main_with_session`
- **Session Tracking:**
  - Team spawn initialization
  - Goal creation and completion
  - State transitions (initialization → execution → ready)
  - Error handling

### Container 2: email_solver
- **Type:** 5-node email processing pipeline
- **Entry:** `python -m src.main_with_session`
- **Session Tracking:**
  - Pipeline stages (config → auth → MCP → graph → services)
  - OAuth token acquisition
  - MCP client initialization
  - Service startup
  - Graceful shutdown

### Container 3: fly_achensee_claude
- **Type:** Claude Code CLI with .claude/ governance
- **Entry:** `claude-code --dangerously-skip-permissions`
- **Session Tracking:**
  - CLI startup
  - Workspace ready state
  - Interactive mode

---

## Session IDs Generated

Each container gets a unique session ID based on Unix timestamp:

```
test-customer-<timestamp>   # fly_achensee_customer
test-email-<timestamp>      # email_solver
test-claude-<timestamp>     # fly_achensee_claude
```

---

## Monitoring

### Dashboard
Open in browser: **http://localhost:3000**

### API Endpoints
```bash
# List all sessions
curl http://localhost:9000/api/query/recent | jq

# Get session state
curl http://localhost:9000/api/state/test-customer-<timestamp> | jq

# Get action log
curl http://localhost:9000/api/actions/test-customer-<timestamp>?limit=10 | jq
```

### Container Logs
```bash
# Follow all logs
docker-compose -f docker-compose.test.yml logs -f

# Follow specific container
docker-compose -f docker-compose.test.yml logs -f customer-comm
docker-compose -f docker-compose.test.yml logs -f email-solver
docker-compose -f docker-compose.test.yml logs -f claude-cli
```

### Session Files
```bash
# List sessions
ls -la /var/claude-sessions/sessions/

# View session state
cat /var/claude-sessions/sessions/test-customer-<timestamp>/state.json | jq

# View actions log
cat /var/claude-sessions/sessions/test-customer-<timestamp>/actions.jsonl | tail -10
```

---

## Common Commands

### Start Services
```bash
TIMESTAMP=$(date +%s) docker-compose -f docker-compose.test.yml up -d
```

### Stop Services
```bash
docker-compose -f docker-compose.test.yml down
```

### Rebuild Containers
```bash
docker-compose -f docker-compose.test.yml build --no-cache
```

### Restart Single Container
```bash
docker-compose -f docker-compose.test.yml restart customer-comm
```

### Shell Access
```bash
docker-compose -f docker-compose.test.yml exec customer-comm bash
docker-compose -f docker-compose.test.yml exec email-solver bash
docker-compose -f docker-compose.test.yml exec claude-cli bash
```

### View Container Status
```bash
docker-compose -f docker-compose.test.yml ps
```

---

## Expected Results

### Successful Test Output

```
🧪 E2E Test Suite for Session Infrastructure
==============================================

Step 1: Verify session storage service is running
==================================================
✅ Session storage service healthy

Step 2: Check if Docker is available
=====================================
✅ Docker and docker-compose available

Step 3: Build test containers
==============================
✅ All containers built successfully

Step 4: Start containers
========================
✅ Containers started

Step 5: Wait for containers to initialize
==========================================
✅ Initialization period complete

Step 6: Check container status
===============================
[Shows running containers]

Step 7: Verify session creation
================================
"test-customer-1707856800"
"test-email-1707856800"
"test-claude-1707856800"

Step 8: Verify session states
==============================
✅ All sessions have valid states

Step 9: Check action logs
=========================
[Shows logged actions]

Step 10: View dashboard
=======================
✅ Dashboard available at: http://localhost:3000

Step 11: Container logs
========================
[Shows container initialization logs]

Step 12: Health summary
=======================
✅ customer-comm: Running
✅ email-solver: Running
✅ claude-cli: Running
```

---

## Troubleshooting

### "Session storage service not running"
```bash
# Start the service
cd /root/software/claude-session-infrastructure
docker-compose up -d session-storage

# Wait for health check
curl http://localhost:9000/health
```

### "Container build failed"
```bash
# Check build logs
cat /tmp/docker-build.log

# Rebuild with verbose output
docker-compose -f docker-compose.test.yml build --no-cache --progress=plain
```

### "Session not created"
```bash
# Check container logs for errors
docker-compose -f docker-compose.test.yml logs customer-comm

# Verify environment variables
docker-compose -f docker-compose.test.yml exec customer-comm env | grep SESSION
```

### "No actions logged"
```bash
# Test connection from container
docker-compose -f docker-compose.test.yml exec customer-comm \
  python -c "import asyncio; from hook_agent import hook_agent; asyncio.run(hook_agent.test_connection())"

# Check network connectivity
docker-compose -f docker-compose.test.yml exec customer-comm \
  curl http://session-storage:9000/health
```

---

## Clean Up

### Stop and remove all containers
```bash
docker-compose -f docker-compose.test.yml down -v
```

### Remove session data
```bash
# WARNING: This deletes all session files
sudo rm -rf /var/claude-sessions/sessions/test-*
```

### Remove built images
```bash
docker-compose -f docker-compose.test.yml down --rmi all
```

---

## Next Steps After Successful Test

1. **Review Session Data**
   - Check /var/claude-sessions/sessions/
   - Verify action logs are complete
   - Validate state transitions

2. **Performance Baseline**
   - Measure session creation time
   - Check action logging latency
   - Monitor WebSocket connections

3. **Production Prep**
   - Add authentication
   - Implement retry logic
   - Set up monitoring
   - Configure backups

4. **Scale Testing**
   - Run multiple concurrent containers
   - Test session isolation
   - Validate resource usage

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│   Session Storage (Port 9000)       │
│   - REST API                         │
│   - WebSocket                        │
│   - File Persistence                 │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
   ┌───▼───┐ ┌─▼────┐ ┌─▼────┐
   │Cust.  │ │Email │ │Claude│
   │Comm   │ │Solver│ │CLI   │
   └───────┘ └──────┘ └──────┘
```

---

**Ready to test?** Run: `./scripts/test-e2e.sh`

