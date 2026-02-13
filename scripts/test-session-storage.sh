#!/bin/bash

# Test Session Storage Service
# This script tests all API endpoints

set -e

API_URL="http://localhost:9000/api"
SESSION_ID="test-$(date +%s)"
USER_ID="test-user-alice"

echo "=================================="
echo "Testing Session Storage Service"
echo "=================================="
echo ""

# Test 1: Health check
echo "1. Health Check..."
curl -s http://localhost:9000/health | jq .
echo "✅ Health check passed"
echo ""

# Test 2: Create session
echo "2. Creating session..."
curl -s -X POST "${API_URL}/sessions" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"${SESSION_ID}\",
    \"userId\": \"${USER_ID}\",
    \"initial\": {
      \"source\": {\"type\": \"test\", \"script\": \"test-session-storage.sh\"},
      \"input\": {\"content\": \"Test prompt for session storage\"},
      \"config\": {\"model\": \"claude-sonnet-4.5\", \"dangerouslySkipPermissions\": true}
    }
  }" | jq .
echo "✅ Session created: ${SESSION_ID}"
echo ""

# Test 3: Get session
echo "3. Getting session..."
curl -s "${API_URL}/sessions/${SESSION_ID}" | jq '.metadata | {sessionId, userId, status, created}'
echo "✅ Session retrieved"
echo ""

# Test 4: Add goal
echo "4. Adding goal..."
curl -s -X POST "${API_URL}/state/${SESSION_ID}/goals" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Build a REST API with Express",
    "priority": "high"
  }' | jq .
echo "✅ Goal added"
echo ""

# Test 5: Spawn agent
echo "5. Spawning agent..."
curl -s -X POST "${API_URL}/state/${SESSION_ID}/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "backend-dev",
    "task": "Implement REST endpoints with authentication"
  }' | jq .
echo "✅ Agent spawned"
echo ""

# Test 6: Log action
echo "6. Logging action..."
curl -s -X POST "${API_URL}/actions/${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "file_write",
    "path": "src/server.js",
    "lines": 42
  }' | jq .
echo "✅ Action logged"
echo ""

# Test 7: Log response
echo "7. Logging response..."
curl -s -X POST "${API_URL}/actions/${SESSION_ID}/responses" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Created server.js with Express setup"
  }' | jq .
echo "✅ Response logged"
echo ""

# Test 8: Update state
echo "8. Updating state..."
curl -s -X PATCH "${API_URL}/state/${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "phase": "implementation",
    "currentStep": "backend-development"
  }' | jq .
echo "✅ State updated"
echo ""

# Test 9: Get actions
echo "9. Getting actions..."
curl -s "${API_URL}/actions/${SESSION_ID}?limit=5" | jq 'length'
echo "✅ Actions retrieved"
echo ""

# Test 10: Get state
echo "10. Getting current state..."
curl -s "${API_URL}/state/${SESSION_ID}" | jq '{phase, currentStep, goals: (.goals | length), agents: (.agents.spawned | length)}'
echo "✅ State retrieved"
echo ""

# Test 11: Get recent sessions
echo "11. Getting recent sessions..."
curl -s "${API_URL}/query/recent" | jq 'length'
echo "✅ Recent sessions retrieved"
echo ""

# Test 12: Get stats
echo "12. Getting stats..."
curl -s "${API_URL}/query/stats" | jq .
echo "✅ Stats retrieved"
echo ""

echo ""
echo "=================================="
echo "✅ All tests passed!"
echo "Session ID: ${SESSION_ID}"
echo "=================================="
echo ""
echo "Next steps:"
echo "  - Open dashboard: http://localhost:3000"
echo "  - View session: ${SESSION_ID}"
echo "  - Connect WebSocket: ws://localhost:9000/ws?session=${SESSION_ID}"
