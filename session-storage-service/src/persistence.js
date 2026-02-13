import fs from 'fs/promises';
import path from 'path';
import { existsSync, createReadStream } from 'fs';
import readline from 'readline';

const SESSIONS_DIR = process.env.SESSIONS_DIR || '/var/claude-sessions';
const MAX_SESSIONS = 50;
const MAX_RECENT = 10;

export class SessionPersistence {
  constructor() {
    this.ensureDirectories();
  }

  async ensureDirectories() {
    await fs.mkdir(path.join(SESSIONS_DIR, 'sessions'), { recursive: true });
    await fs.mkdir(path.join(SESSIONS_DIR, 'recent'), { recursive: true });
  }

  // Create new session
  async createSession(sessionId, userId, initial) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.mkdir(path.join(sessionDir, 'subsessions'), { recursive: true });

    const now = new Date().toISOString();

    // metadata.json
    await this.writeJSON(path.join(sessionDir, 'metadata.json'), {
      $schema: 'session-metadata-v1',
      sessionId,
      userId,
      sandboxId: null,
      created: now,
      updated: now,
      status: 'active',
      model: initial.config?.model || 'claude-sonnet-4.5',
      yoloMode: initial.config?.dangerouslySkipPermissions || false,
      tokenUsage: { input: 0, output: 0, total: 0 },
      metrics: {
        agentsSpawned: 0,
        toolCalls: 0,
        mcpCalls: 0,
        filesModified: 0,
        bashCommands: 0
      },
      tags: [],
      parentSession: null,
      subsessions: []
    });

    // initial.json
    await this.writeJSON(path.join(sessionDir, 'initial.json'), {
      $schema: 'session-initial-v1',
      timestamp: now,
      source: initial.source,
      input: initial.input,
      config: initial.config
    });

    // state.json
    await this.writeJSON(path.join(sessionDir, 'state.json'), {
      $schema: 'session-state-v1',
      version: 1,
      timestamp: now,
      phase: 'initialization',
      currentStep: null,
      goals: [],
      priorities: { current: null, queue: [], blocked: [] },
      expectedOutcome: {},
      agents: { spawned: [], active: [], completed: [] },
      mcp: { swarm: {}, memory: { keys: [] } },
      workspace: { cwd: '/workspace', filesCreated: [], filesModified: [], gitStatus: {} },
      errors: []
    });

    // Create empty JSONL files
    await fs.writeFile(path.join(sessionDir, 'actions.jsonl'), '');
    await fs.writeFile(path.join(sessionDir, 'responses.jsonl'), '');

    // Update index
    await this.updateIndex(sessionId, userId, now);

    // Update recent symlinks
    await this.updateRecent(sessionId);

    // Cleanup old sessions
    await this.cleanupOld();

    return sessionDir;
  }

  // Append action
  async appendAction(sessionId, action) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    const actionsFile = path.join(sessionDir, 'actions.jsonl');

    const seq = await this.getNextSeq(actionsFile);
    const entry = {
      seq,
      timestamp: new Date().toISOString(),
      ...action
    };

    await fs.appendFile(actionsFile, JSON.stringify(entry) + '\n');

    // Update metadata
    await this.updateMetadata(sessionId, {
      updated: entry.timestamp,
      [`metrics.${this.getMetricKey(action.type)}`]: '+1'
    });
  }

  // Append response
  async appendResponse(sessionId, response) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    const responsesFile = path.join(sessionDir, 'responses.jsonl');

    const seq = await this.getNextSeq(responsesFile);
    const entry = {
      seq,
      timestamp: new Date().toISOString(),
      ...response
    };

    await fs.appendFile(responsesFile, JSON.stringify(entry) + '\n');
  }

  // Update state
  async updateState(sessionId, updates) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    const stateFile = path.join(sessionDir, 'state.json');

    const state = await this.readJSON(stateFile);

    // Deep merge updates
    const newState = this.deepMerge(state, updates);
    newState.version += 1;
    newState.timestamp = new Date().toISOString();

    await this.writeJSON(stateFile, newState);
  }

  // Add goal
  async addGoal(sessionId, goal) {
    const state = await this.getState(sessionId);

    goal.id = goal.id || `goal-${state.goals.length + 1}`;
    goal.status = goal.status || 'pending';

    state.goals.push(goal);

    await this.updateState(sessionId, { goals: state.goals });
  }

  // Update goal status
  async updateGoal(sessionId, goalId, updates) {
    const state = await this.getState(sessionId);
    const goal = state.goals.find(g => g.id === goalId);

    if (goal) {
      Object.assign(goal, updates);
      if (updates.status === 'completed') {
        goal.completedAt = new Date().toISOString();
      }
      await this.updateState(sessionId, { goals: state.goals });
    }
  }

  // Spawn agent
  async spawnAgent(sessionId, agent) {
    const state = await this.getState(sessionId);

    const agentRecord = {
      agentId: agent.agentId || `agent-${agent.type}-${Date.now().toString(36)}`,
      type: agent.type,
      task: agent.task,
      status: 'spawned',
      spawnedAt: new Date().toISOString(),
      subsession: agent.subsession || null
    };

    state.agents.spawned.push(agentRecord);
    state.agents.active.push(agentRecord.agentId);

    await this.updateState(sessionId, { agents: state.agents });
    await this.updateMetadata(sessionId, { 'metrics.agentsSpawned': '+1' });

    return agentRecord;
  }

  // Complete agent
  async completeAgent(sessionId, agentId) {
    const state = await this.getState(sessionId);

    const agent = state.agents.spawned.find(a => a.agentId === agentId);
    if (agent) {
      agent.status = 'completed';
      agent.completedAt = new Date().toISOString();

      state.agents.active = state.agents.active.filter(id => id !== agentId);
      state.agents.completed.push(agentId);

      await this.updateState(sessionId, { agents: state.agents });
    }
  }

  // Finalize session
  async finalizeSession(sessionId, finalData) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    const state = await this.getState(sessionId);
    const metadata = await this.readJSON(path.join(sessionDir, 'metadata.json'));

    const final = {
      $schema: 'session-final-v1',
      timestamp: new Date().toISOString(),
      status: finalData.status || 'success',
      outcome: finalData.outcome,
      goalsAchieved: state.goals.filter(g => g.status === 'completed'),
      finalResponse: finalData.response,
      metrics: metadata.metrics,
      subsessions: metadata.subsessions
    };

    await this.writeJSON(path.join(sessionDir, 'final.json'), final);

    // Update metadata status
    await this.updateMetadata(sessionId, {
      status: 'completed',
      duration: Date.now() - new Date(metadata.created).getTime()
    });
  }

  // Get session state
  async getState(sessionId) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    return await this.readJSON(path.join(sessionDir, 'state.json'));
  }

  // Get all actions
  async getActions(sessionId, limit = null) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    const actionsFile = path.join(sessionDir, 'actions.jsonl');
    return await this.readJSONL(actionsFile, limit);
  }

  // Get all responses
  async getResponses(sessionId, limit = null) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    const responsesFile = path.join(sessionDir, 'responses.jsonl');
    return await this.readJSONL(responsesFile, limit);
  }

  // Restore session (for resume)
  async restoreSession(sessionId) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);

    return {
      metadata: await this.readJSON(path.join(sessionDir, 'metadata.json')),
      initial: await this.readJSON(path.join(sessionDir, 'initial.json')),
      state: await this.readJSON(path.join(sessionDir, 'state.json')),
      actions: await this.getActions(sessionId),
      responses: await this.getResponses(sessionId),
      final: existsSync(path.join(sessionDir, 'final.json'))
        ? await this.readJSON(path.join(sessionDir, 'final.json'))
        : null
    };
  }

  // Get sessions by user
  async getSessionsByUser(userId) {
    const indexFile = path.join(SESSIONS_DIR, 'index.json');
    if (!existsSync(indexFile)) return [];

    const index = JSON.parse(await fs.readFile(indexFile, 'utf-8'));
    return Object.entries(index)
      .filter(([_, data]) => data.userId === userId)
      .map(([sessionId, data]) => ({ sessionId, ...data }));
  }

  // Get recent sessions
  async getRecentSessions() {
    const recentDir = path.join(SESSIONS_DIR, 'recent');
    const links = await fs.readdir(recentDir);

    const sessions = [];
    for (const link of links.sort()) {
      const sessionId = link.split('-').slice(1).join('-');
      const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
      const metadata = await this.readJSON(path.join(sessionDir, 'metadata.json'));
      sessions.push(metadata);
    }

    return sessions;
  }

  // Delete session
  async deleteSession(sessionId) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    await fs.rm(sessionDir, { recursive: true, force: true });

    // Remove from index
    const indexFile = path.join(SESSIONS_DIR, 'index.json');
    if (existsSync(indexFile)) {
      const index = JSON.parse(await fs.readFile(indexFile, 'utf-8'));
      delete index[sessionId];
      await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
    }
  }

  // Helper: Read JSON
  async readJSON(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  // Helper: Write JSON
  async writeJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // Helper: Read JSONL
  async readJSONL(jsonlFile, limit = null) {
    if (!existsSync(jsonlFile)) return [];

    const lines = [];
    const rl = readline.createInterface({
      input: createReadStream(jsonlFile),
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        lines.push(JSON.parse(line));
        if (limit && lines.length >= limit) break;
      }
    }

    return lines;
  }

  // Helper: Get next sequence number
  async getNextSeq(jsonlFile) {
    const lines = await this.readJSONL(jsonlFile);
    return lines.length > 0 ? lines[lines.length - 1].seq + 1 : 1;
  }

  // Helper: Update metadata
  async updateMetadata(sessionId, updates) {
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);
    const metaFile = path.join(sessionDir, 'metadata.json');
    const meta = await this.readJSON(metaFile);

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string' && value.startsWith('+')) {
        // Increment
        const pathParts = key.split('.');
        let obj = meta;
        for (let i = 0; i < pathParts.length - 1; i++) {
          obj = obj[pathParts[i]];
        }
        obj[pathParts[pathParts.length - 1]] += parseInt(value.substring(1));
      } else {
        // Set
        const pathParts = key.split('.');
        let obj = meta;
        for (let i = 0; i < pathParts.length - 1; i++) {
          obj = obj[pathParts[i]];
        }
        obj[pathParts[pathParts.length - 1]] = value;
      }
    }

    await this.writeJSON(metaFile, meta);
  }

  // Update recent symlinks
  async updateRecent(sessionId) {
    const recentDir = path.join(SESSIONS_DIR, 'recent');
    const sessionDir = path.join(SESSIONS_DIR, 'sessions', sessionId);

    // Get existing recent sessions
    const recent = await fs.readdir(recentDir).catch(() => []);
    const recentSessions = recent.map(name => {
      const match = name.match(/^(\d+)-(.+)$/);
      return match ? { num: parseInt(match[1]), id: match[2] } : null;
    }).filter(Boolean);

    // Remove oldest if at max
    if (recentSessions.length >= MAX_RECENT) {
      const oldest = recentSessions.sort((a, b) => b.num - a.num)[0];
      await fs.unlink(path.join(recentDir, `${String(oldest.num).padStart(2, '0')}-${oldest.id}`)).catch(() => {});
      recentSessions.splice(recentSessions.indexOf(oldest), 1);
    }

    // Renumber
    for (let i = 0; i < recentSessions.length; i++) {
      const old = `${String(recentSessions[i].num).padStart(2, '0')}-${recentSessions[i].id}`;
      const newNum = i + 2;
      const newName = `${String(newNum).padStart(2, '0')}-${recentSessions[i].id}`;
      await fs.rename(path.join(recentDir, old), path.join(recentDir, newName)).catch(() => {});
    }

    // Add new as #1
    const linkName = `01-${sessionId}`;
    const linkPath = path.join(recentDir, linkName);
    await fs.unlink(linkPath).catch(() => {}); // Remove if exists
    await fs.symlink(sessionDir, linkPath);
  }

  // Cleanup old sessions
  async cleanupOld() {
    const sessionsDir = path.join(SESSIONS_DIR, 'sessions');
    const sessions = await fs.readdir(sessionsDir);

    if (sessions.length <= MAX_SESSIONS) return;

    // Get creation times
    const sessionTimes = await Promise.all(
      sessions.map(async (sid) => {
        const meta = await this.readJSON(path.join(sessionsDir, sid, 'metadata.json'));
        return { id: sid, created: new Date(meta.created).getTime() };
      })
    );

    // Sort by age
    sessionTimes.sort((a, b) => a.created - b.created);

    // Remove oldest
    const toRemove = sessionTimes.slice(0, sessions.length - MAX_SESSIONS);
    for (const { id } of toRemove) {
      await fs.rm(path.join(sessionsDir, id), { recursive: true, force: true });
    }
  }

  // Helper: Deep merge
  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  // Helper: Get metric key
  getMetricKey(actionType) {
    const map = {
      'task_spawn': 'agentsSpawned',
      'tool_call': 'toolCalls',
      'mcp_call': 'mcpCalls',
      'file_write': 'filesModified',
      'file_edit': 'filesModified',
      'bash_exec': 'bashCommands'
    };
    return map[actionType] || 'toolCalls';
  }

  // Update index
  async updateIndex(sessionId, userId, timestamp) {
    const indexFile = path.join(SESSIONS_DIR, 'index.json');
    let index = {};

    if (existsSync(indexFile)) {
      index = JSON.parse(await fs.readFile(indexFile, 'utf-8'));
    }

    index[sessionId] = { userId, created: timestamp };
    await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
  }
}
