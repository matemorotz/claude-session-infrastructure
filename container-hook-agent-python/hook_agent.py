"""
Python Hook Agent for Session Storage Integration
Provides async HTTP client for logging actions, responses, and state updates.
"""
import os
import httpx
from typing import Optional, Dict, Any
from datetime import datetime


SESSION_ID = os.getenv('SESSION_ID')
SESSION_SERVICE_URL = os.getenv('SESSION_SERVICE_URL', 'http://localhost:9000')


class SessionHookAgent:
    """Async HTTP client for session storage service integration"""

    def __init__(self, session_id: Optional[str] = None, service_url: Optional[str] = None):
        self.session_id = session_id or SESSION_ID
        self.service_url = service_url or SESSION_SERVICE_URL
        self.client = httpx.AsyncClient(timeout=5.0)

    async def test_connection(self) -> bool:
        """Test connection to session service"""
        try:
            response = await self.client.get(f"{self.service_url}/health")
            return response.status_code == 200
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False

    async def log_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Log an action to the session"""
        url = f"{self.service_url}/api/actions/{self.session_id}"
        response = await self.client.post(url, json=action)
        response.raise_for_status()
        return response.json()

    async def log_response(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log a response to the session"""
        url = f"{self.service_url}/api/actions/{self.session_id}/responses"
        response = await self.client.post(url, json=response_data)
        response.raise_for_status()
        return response.json()

    async def update_state(self, state_update: Dict[str, Any]) -> Dict[str, Any]:
        """Update session state"""
        url = f"{self.service_url}/api/state/{self.session_id}"
        response = await self.client.patch(url, json=state_update)
        response.raise_for_status()
        return response.json()

    async def add_goal(self, goal: Dict[str, Any]) -> Dict[str, Any]:
        """Add a goal to the session"""
        url = f"{self.service_url}/api/state/{self.session_id}/goals"
        response = await self.client.post(url, json=goal)
        response.raise_for_status()
        return response.json()

    async def update_goal(self, goal_id: str, update: Dict[str, Any]) -> Dict[str, Any]:
        """Update a goal"""
        url = f"{self.service_url}/api/state/{self.session_id}/goals/{goal_id}"
        response = await self.client.patch(url, json=update)
        response.raise_for_status()
        return response.json()

    async def spawn_agent(self, agent: Dict[str, Any]) -> Dict[str, Any]:
        """Spawn a new agent"""
        url = f"{self.service_url}/api/state/{self.session_id}/agents"
        response = await self.client.post(url, json=agent)
        response.raise_for_status()
        return response.json()

    async def complete_agent(self, agent_id: str) -> Dict[str, Any]:
        """Mark agent as complete"""
        url = f"{self.service_url}/api/state/{self.session_id}/agents/{agent_id}/complete"
        response = await self.client.post(url)
        response.raise_for_status()
        return response.json()

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Singleton instance
hook_agent = SessionHookAgent()
