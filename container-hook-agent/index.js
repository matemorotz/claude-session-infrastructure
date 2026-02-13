#!/usr/bin/env node

import axios from 'axios';

const SESSION_SERVICE_URL = process.env.SESSION_SERVICE_URL || 'http://localhost:9000';
const SESSION_ID = process.env.SESSION_ID;

if (!SESSION_ID) {
  console.error('[Hook Agent] ERROR: SESSION_ID environment variable not set');
  process.exit(1);
}

console.log(`[Hook Agent] Starting for session ${SESSION_ID}`);
console.log(`[Hook Agent] Session service: ${SESSION_SERVICE_URL}`);

// Helper to call session service
async function callService(endpoint, method = 'POST', data = {}) {
  try {
    const url = `${SESSION_SERVICE_URL}/api${endpoint}`;
    const response = await axios({ method, url, data, timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error(`[Hook Agent] Error calling ${endpoint}:`, error.message);
    return null;
  }
}

// Log action
export async function logAction(action) {
  console.log(`[Hook Agent] Log action: ${action.type}`);
  return await callService(`/actions/${SESSION_ID}`, 'POST', action);
}

// Log response
export async function logResponse(response) {
  console.log(`[Hook Agent] Log response: ${response.type}`);
  return await callService(`/actions/${SESSION_ID}/responses`, 'POST', response);
}

// Update state
export async function updateState(stateUpdate) {
  console.log(`[Hook Agent] Update state`);
  return await callService(`/state/${SESSION_ID}`, 'PATCH', stateUpdate);
}

// Add goal
export async function addGoal(goal) {
  console.log(`[Hook Agent] Add goal: ${goal.description}`);
  return await callService(`/state/${SESSION_ID}/goals`, 'POST', goal);
}

// Update goal
export async function updateGoal(goalId, update) {
  console.log(`[Hook Agent] Update goal: ${goalId}`);
  return await callService(`/state/${SESSION_ID}/goals/${goalId}`, 'PATCH', update);
}

// Spawn agent
export async function spawnAgent(agent) {
  console.log(`[Hook Agent] Spawn agent: ${agent.type}`);
  return await callService(`/state/${SESSION_ID}/agents`, 'POST', agent);
}

// Complete agent
export async function completeAgent(agentId) {
  console.log(`[Hook Agent] Complete agent: ${agentId}`);
  return await callService(`/state/${SESSION_ID}/agents/${agentId}/complete`, 'POST');
}

// Finalize session
export async function finalizeSession(finalData) {
  console.log(`[Hook Agent] Finalize session`);
  return await callService(`/sessions/${SESSION_ID}/finalize`, 'POST', finalData);
}

// Test connection
async function testConnection() {
  try {
    const response = await axios.get(`${SESSION_SERVICE_URL}/health`, { timeout: 5000 });
    console.log('[Hook Agent] Connection test successful:', response.data);
    return true;
  } catch (error) {
    console.error('[Hook Agent] Connection test failed:', error.message);
    return false;
  }
}

// If run directly, test connection
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[Hook Agent] Running connection test...');
  const connected = await testConnection();

  if (connected) {
    console.log('[Hook Agent] Ready - export functions from this module to use');
    console.log('[Hook Agent] Example:');
    console.log('  import { logAction, addGoal } from "./hook-agent/index.js";');
    console.log('  await logAction({ type: "test", data: "Hello" });');
  } else {
    console.error('[Hook Agent] Failed to connect to session service');
    process.exit(1);
  }
}

export default {
  logAction,
  logResponse,
  updateState,
  addGoal,
  updateGoal,
  spawnAgent,
  completeAgent,
  finalizeSession,
  testConnection
};
