# Python Hook Agent for Session Storage

Async HTTP client library for integrating Python applications with the centralized session storage service.

## Installation

```bash
pip install -e /path/to/container-hook-agent-python
```

## Usage

```python
import asyncio
from hook_agent import hook_agent

async def main():
    # Test connection
    connected = await hook_agent.test_connection()

    # Log action
    await hook_agent.log_action({
        "type": "example_action",
        "timestamp": "2026-02-13T10:00:00Z",
        "details": {"key": "value"}
    })

    # Update state
    await hook_agent.update_state({
        "phase": "execution",
        "currentStep": "processing"
    })

    # Close client when done
    await hook_agent.close()

asyncio.run(main())
```

## Environment Variables

- `SESSION_ID` - Unique session identifier
- `SESSION_SERVICE_URL` - URL of session storage service (default: http://localhost:9000)

## API Methods

- `test_connection()` - Test connectivity to session service
- `log_action(action)` - Log an action
- `log_response(response)` - Log a response
- `update_state(state)` - Update session state
- `add_goal(goal)` - Add a new goal
- `update_goal(goal_id, update)` - Update existing goal
- `spawn_agent(agent)` - Spawn a new agent
- `complete_agent(agent_id)` - Mark agent as complete
- `close()` - Close HTTP client
