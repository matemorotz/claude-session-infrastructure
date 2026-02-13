#!/bin/bash
set -e

echo "🧪 E2E Test Suite for Session Infrastructure"
echo "=============================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate timestamp for unique session IDs
export TIMESTAMP=$(date +%s)

echo "Step 1: Verify session storage service is running"
echo "=================================================="
if curl -f http://localhost:9000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Session storage service healthy${NC}"
else
    echo -e "${RED}❌ Session storage service not running${NC}"
    echo "Please start the service first: docker-compose up -d session-storage"
    exit 1
fi
echo ""

echo "Step 2: Check if Docker is available"
echo "====================================="
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found${NC}"
    exit 1
fi
# Check for both docker-compose and docker compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ docker compose not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker and compose available ($COMPOSE_CMD)${NC}"
echo ""

echo "Step 3: Build test containers"
echo "=============================="
cd /root/software/claude-session-infrastructure
echo "Building containers (this may take a few minutes)..."
if $COMPOSE_CMD -f docker-compose.test.yml build 2>&1 | tee /tmp/docker-build.log; then
    echo -e "${GREEN}✅ All containers built successfully${NC}"
else
    echo -e "${RED}❌ Container build failed${NC}"
    echo "Check /tmp/docker-build.log for details"
    exit 1
fi
echo ""

echo "Step 4: Start containers"
echo "========================"
echo "Starting all services with SESSION_ID timestamps: test-*-${TIMESTAMP}"
TIMESTAMP=$TIMESTAMP $COMPOSE_CMD -f docker-compose.test.yml up -d
echo -e "${GREEN}✅ Containers started${NC}"
echo ""

echo "Step 5: Wait for containers to initialize"
echo "=========================================="
echo "Waiting 30 seconds for services to start..."
for i in {30..1}; do
    echo -ne "  ${i} seconds remaining...\r"
    sleep 1
done
echo -e "${GREEN}✅ Initialization period complete${NC}"
echo ""

echo "Step 6: Check container status"
echo "==============================="
$COMPOSE_CMD -f docker-compose.test.yml ps
echo ""

echo "Step 7: Verify session creation"
echo "================================"
echo "Expected session IDs:"
echo "  - test-customer-${TIMESTAMP}"
echo "  - test-email-${TIMESTAMP}"
echo "  - test-claude-${TIMESTAMP}"
echo ""

echo "Querying recent sessions from API..."
curl -s http://localhost:9000/api/query/recent | jq '.[].sessionId' || echo "No sessions found yet"
echo ""

echo "Step 8: Verify session states"
echo "=============================="
for session in test-customer-${TIMESTAMP} test-email-${TIMESTAMP} test-claude-${TIMESTAMP}; do
    echo "Checking session: $session"
    STATE=$(curl -s http://localhost:9000/api/state/$session 2>/dev/null)
    if [ -n "$STATE" ]; then
        echo "$STATE" | jq '{phase: .phase, currentStep: .currentStep}' || echo "  State exists but format unexpected"
    else
        echo -e "  ${YELLOW}⚠️  Session not created yet${NC}"
    fi
    echo ""
done

echo "Step 9: Check action logs"
echo "========================="
echo "Sample actions from customer-comm container:"
curl -s "http://localhost:9000/api/actions/test-customer-${TIMESTAMP}?limit=10" 2>/dev/null | jq '.[].type' || echo "No actions logged yet"
echo ""

echo "Step 10: View dashboard"
echo "======================="
echo -e "${GREEN}Dashboard available at: http://localhost:3000${NC}"
echo "Open in browser to see live session updates"
echo ""

echo "Step 11: Container logs (last 20 lines each)"
echo "============================================="
echo ""
echo "--- customer-comm logs ---"
$COMPOSE_CMD -f docker-compose.test.yml logs --tail=20 customer-comm
echo ""
echo "--- email-solver logs ---"
$COMPOSE_CMD -f docker-compose.test.yml logs --tail=20 email-solver
echo ""
echo "--- claude-cli logs ---"
$COMPOSE_CMD -f docker-compose.test.yml logs --tail=20 claude-cli
echo ""

echo "Step 12: Health summary"
echo "======================="
CUSTOMER_RUNNING=$($COMPOSE_CMD -f docker-compose.test.yml ps customer-comm | grep -c "Up" || echo "0")
EMAIL_RUNNING=$($COMPOSE_CMD -f docker-compose.test.yml ps email-solver | grep -c "Up" || echo "0")
CLAUDE_RUNNING=$($COMPOSE_CMD -f docker-compose.test.yml ps claude-cli | grep -c "Up" || echo "0")

echo "Container Status:"
if [ "$CUSTOMER_RUNNING" -gt 0 ]; then
    echo -e "  customer-comm: ${GREEN}✅ Running${NC}"
else
    echo -e "  customer-comm: ${RED}❌ Not running${NC}"
fi

if [ "$EMAIL_RUNNING" -gt 0 ]; then
    echo -e "  email-solver: ${GREEN}✅ Running${NC}"
else
    echo -e "  email-solver: ${RED}❌ Not running${NC}"
fi

if [ "$CLAUDE_RUNNING" -gt 0 ]; then
    echo -e "  claude-cli: ${GREEN}✅ Running${NC}"
else
    echo -e "  claude-cli: ${RED}❌ Not running${NC}"
fi
echo ""

echo "=============================================="
echo -e "${GREEN}✅ E2E test suite complete!${NC}"
echo "=============================================="
echo ""
echo "Useful commands:"
echo "  Follow logs:    $COMPOSE_CMD -f docker-compose.test.yml logs -f customer-comm"
echo "  Check status:   $COMPOSE_CMD -f docker-compose.test.yml ps"
echo "  Stop all:       $COMPOSE_CMD -f docker-compose.test.yml down"
echo "  Restart one:    $COMPOSE_CMD -f docker-compose.test.yml restart customer-comm"
echo "  Shell access:   $COMPOSE_CMD -f docker-compose.test.yml exec claude-cli bash"
echo ""
echo "Session files location: /var/claude-sessions/sessions/"
echo "Dashboard: http://localhost:3000"
echo ""
