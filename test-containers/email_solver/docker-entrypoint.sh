#!/bin/bash
set -e

# Verify session configuration
if [ -z "$SESSION_ID" ]; then
    echo "ERROR: SESSION_ID not set"
    exit 1
fi

echo "Starting email_solver container"
echo "Session ID: $SESSION_ID"
echo "Session Service: $SESSION_SERVICE_URL"

# Test connection to session service
python -c "
import asyncio
from hook_agent import hook_agent

async def test():
    connected = await hook_agent.test_connection()
    if connected:
        print('✅ Connected to session storage service')
    else:
        print('❌ Failed to connect to session storage service')
        exit(1)

asyncio.run(test())
"

# Run the application
cd /app/project
exec python -m src.main_with_session
