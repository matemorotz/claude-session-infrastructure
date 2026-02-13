#!/bin/bash
set -e

# Verify session configuration
if [ -z "$SESSION_ID" ]; then
    echo "ERROR: SESSION_ID not set"
    exit 1
fi

echo "Starting fly_achensee_claude Claude Code CLI container"
echo "Session ID: $SESSION_ID"
echo "Session Service: $SESSION_SERVICE_URL"

# Test connection to session service
python3 -c "
import asyncio
from hook_agent import hook_agent

async def test():
    connected = await hook_agent.test_connection()
    if connected:
        print('✅ Connected to session storage service')
        # Log session start
        from datetime import datetime
        await hook_agent.log_action({
            'type': 'claude_cli_start',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'details': {
                'container': 'fly_achensee_claude',
                'workspace': '/app/workspace'
            }
        })
        await hook_agent.update_state({
            'phase': 'interactive',
            'currentStep': 'claude_cli_ready',
            'workspace': {
                'cwd': '/app/workspace'
            }
        })
        await hook_agent.close()
        print('✅ Session initialized')
    else:
        print('❌ Failed to connect to session storage service')
        exit(1)

asyncio.run(test())
"

# Start Claude Code CLI in interactive mode
cd /app/workspace

echo ""
echo "🎯 Claude Code CLI ready in /app/workspace"
echo "📊 Session tracking enabled - all actions logged to session storage"
echo ""

# Start Claude Code CLI in YOLO mode for automated testing
# For interactive use, remove --dangerously-skip-permissions
exec claude-code --dangerously-skip-permissions
