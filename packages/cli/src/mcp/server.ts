// Mindr MCP server — exposes memory tools via the Model Context Protocol.

import { Server } from '@modelcontextprotocol/sdk/server'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { MemoryBackend } from '@emartai/mindr-core'
import {
  buildSessionContext,
  checkForBugPatterns,
  checkpointSession,
  estimateSavings,
  estimateTokens,
  queryDebt,
  queryConventions,
  scoreContextHealth,
} from '@emartai/mindr-core'

// ---------------------------------------------------------------------------
// Tool definitions (JSON Schema)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'mindr:get_context',
    description:
      'Returns structured session context: stack, recent decisions, hot modules, active conventions, and warnings. Use this at the start of a session to orient yourself in the codebase.',
    inputSchema: {
      type: 'object',
      properties: {
        module:     { type: 'string',  description: 'Focus on a specific module or directory' },
        files:      { type: 'array', items: { type: 'string' }, description: 'Changed files for scoped context' },
        max_tokens: { type: 'number', description: 'Token budget for the response (default: unlimited)' },
        session_id: { type: 'string', description: 'Session ID for metering' },
      },
    },
  },
  {
    name: 'mindr:remember',
    description: 'Store a manual memory — a decision, note, bug pattern, or convention observation.',
    inputSchema: {
      type: 'object',
      required: ['content', 'type'],
      properties: {
        content: { type: 'string', description: 'The memory text to store' },
        type:    {
          type: 'string',
          enum: ['decision', 'convention', 'bug_pattern', 'debt', 'note', 'context'],
          description: 'Memory type',
        },
        module:  { type: 'string', description: 'Module or component this memory relates to' },
        tags:    {
          type: 'array',
          items: {
            type: 'object',
            properties: { key: { type: 'string' }, value: { type: 'string' } },
            required: ['key', 'value'],
          },
          description: 'Additional key/value tags',
        },
      },
    },
  },
  {
    name: 'mindr:check_for_bug_patterns',
    description: 'Fingerprint code and warn when known bug-fix patterns reappear. Mindr never blocks; it only reports matches and confidence.',
    inputSchema: {
      type: 'object',
      required: ['code', 'language'],
      properties: {
        code: { type: 'string' },
        language: { type: 'string' },
      },
    },
  },
  {
    name: 'mindr:context_health',
    description: 'Score whether the current session context is drifting.',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'object' },
      },
    },
  },
  {
    name: 'mindr:checkpoint',
    description: 'Write a session checkpoint memory for later retrieval.',
    inputSchema: {
      type: 'object',
      required: ['session_id'],
      properties: {
        session_id: { type: 'string' },
        summary: { type: 'string' },
      },
    },
  },
  {
    name: 'mindr:query',
    description: 'Query stored memories by type, module, or recency.',
    inputSchema: {
      type: 'object',
      properties: {
        type:   {
          type: 'string',
          enum: ['decision', 'convention', 'bug_pattern', 'debt', 'note', 'context'],
          description: 'Filter by memory type',
        },
        module: { type: 'string', description: 'Filter by module tag' },
        since:  { type: 'string', description: 'ISO date — only return memories created after this date' },
        limit:  { type: 'number', description: 'Maximum number of results (default: 20)' },
      },
    },
  },
  {
    name: 'mindr:get_debt',
    description: 'List active technical debt items (TODO / FIXME / HACK markers). Returns location, severity, keyword, and age.',
    inputSchema: {
      type: 'object',
      properties: {
        module:   { type: 'string', description: 'Filter by module' },
        severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Filter by severity level' },
        limit:    { type: 'number', description: 'Maximum number of results (default: 50)' },
      },
    },
  },
  {
    name: 'mindr:get_conventions',
    description: 'Return detected code convention profiles — naming styles, file patterns, import grouping, and error handling per language.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Filter to a specific language (e.g. "typescript", "python")' },
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type JsonObj = Record<string, unknown>

async function handleGetContext(args: JsonObj, backend: MemoryBackend): Promise<string> {
  const ctx = await buildSessionContext(backend, {
    module:     typeof args['module']     === 'string' ? args['module']     : undefined,
    files:      Array.isArray(args['files']) ? args['files'] as string[]    : undefined,
    max_tokens: typeof args['max_tokens'] === 'number' ? args['max_tokens'] : undefined,
  })
  const sessionId = typeof args['session_id'] === 'string' ? args['session_id'] : undefined
  if (sessionId) {
    const sourceMemories = await backend.listByTags([], 50)
    const savings = estimateSavings(estimateTokens(ctx.summary), sourceMemories.map((m) => m.content))
    await backend.store({
      content: `Metered context injection for ${sessionId}`,
      role: 'system',
      sessionId,
      tags: [{ key: 'type', value: 'metering' }, { key: 'session', value: sessionId }],
      metadata: {
        tokensInjected: savings.injected,
        estimatedSaved: savings.saved,
        savingsRange: { low: savings.low, high: savings.high },
        counterfactualBaseline: savings.baseline,
        tool: 'mindr:get_context',
      },
    })
  }
  return ctx.summary
}

async function handleRemember(args: JsonObj, backend: MemoryBackend): Promise<string> {
  const content = String(args['content'] ?? '')
  const type    = String(args['type']    ?? 'note')
  const module  = typeof args['module'] === 'string' ? args['module'] : 'root'

  const baseTags = [
    { key: 'type',   value: type },
    { key: 'module', value: module },
  ]
  const extraTags: Array<{ key: string; value: string }> = []
  if (Array.isArray(args['tags'])) {
    for (const t of args['tags']) {
      if (t && typeof t === 'object' && 'key' in t && 'value' in t) {
        extraTags.push({ key: String(t.key), value: String(t.value) })
      }
    }
  }

  const memory = await backend.store({
    content,
    role: 'user',
    tags: [...baseTags, ...extraTags],
  })
  return `Stored memory ${memory.id.slice(0, 8)} (type=${type}, module=${module})`
}

async function handleQuery(args: JsonObj, backend: MemoryBackend): Promise<string> {
  const tags: Array<{ key: string; value: string }> = []
  if (typeof args['type']   === 'string') tags.push({ key: 'type',   value: args['type'] })
  if (typeof args['module'] === 'string') tags.push({ key: 'module', value: args['module'] })

  const limit = typeof args['limit'] === 'number' ? args['limit'] : 20
  const since = typeof args['since'] === 'string' ? new Date(args['since']) : undefined

  const mems = tags.length > 0
    ? await backend.listByTags(tags, limit * 2)   // over-fetch for date filtering
    : await backend.search({ query: '', limit: limit * 2 })

  const filtered = since
    ? mems.filter((m) => new Date(m.createdAt) >= since)
    : mems

  const results = filtered.slice(0, limit)

  if (results.length === 0) return 'No memories found matching the given filters.'

  return results
    .map((m) => {
      const typeTag  = m.tags.find((t) => t.key === 'type')?.value  ?? '?'
      const modTag   = m.tags.find((t) => t.key === 'module')?.value ?? '?'
      const date     = m.createdAt.slice(0, 10)
      return `[${date}] [${typeTag}/${modTag}] ${m.content}`
    })
    .join('\n')
}

async function handleCheckForBugPatterns(args: JsonObj, backend: MemoryBackend): Promise<string> {
  const code = String(args['code'] ?? '')
  const language = String(args['language'] ?? '')
  const result = await checkForBugPatterns(backend, code, language)
  if (result.matches.length === 0) {
    return JSON.stringify({ warning: false, confidence: 0, matches: [] })
  }
  return JSON.stringify({
    warning: true,
    confidence: result.confidence,
    hits: result.hits,
    totalFingerprints: result.totalFingerprints,
    matches: result.matches.map((match) => ({
      id: match.memory.id,
      fingerprint: match.fingerprint,
      module: match.memory.tags.find((tag) => tag.key === 'module')?.value,
      fixCommit: match.memory.tags.find((tag) => tag.key === 'fix_commit')?.value,
      content: match.memory.content,
    })),
  })
}

async function handleContextHealth(args: JsonObj): Promise<string> {
  const raw = args['session']
  const session = raw && typeof raw === 'object' ? raw as JsonObj : args
  const list = (key: string): string[] => Array.isArray(session[key]) ? (session[key] as unknown[]).map(String) : []
  const result = scoreContextHealth({
    filesTouched: list('filesTouched'),
    modulesTouched: list('modulesTouched'),
    activeTaskFiles: list('activeTaskFiles'),
    startedAt: typeof session['startedAt'] === 'string' ? session['startedAt'] : undefined,
    topicSpread: typeof session['topicSpread'] === 'number' ? session['topicSpread'] : undefined,
  })
  return JSON.stringify({ score: result.score, recommendation: result.recommendation, breakdown: result.breakdown })
}

async function handleGetDebt(args: JsonObj, backend: MemoryBackend): Promise<string> {
  let mems = await queryDebt(backend)

  if (typeof args['module'] === 'string') {
    mems = mems.filter((m) => m.tags.some((t) => t.key === 'module' && t.value === args['module']))
  }
  if (typeof args['severity'] === 'string') {
    mems = mems.filter((m) => m.tags.some((t) => t.key === 'severity' && t.value === args['severity']))
  }

  const limit = typeof args['limit'] === 'number' ? args['limit'] : 50
  const results = mems.slice(0, limit)

  if (results.length === 0) return 'No active debt items found.'

  const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))

  return results.map((m) => {
    const severity = m.tags.find((t) => t.key === 'severity')?.value ?? 'medium'
    const module   = m.tags.find((t) => t.key === 'module')?.value ?? '?'
    const file     = typeof m.metadata?.['file'] === 'string' ? m.metadata['file'] : ''
    const line     = typeof m.metadata?.['line'] === 'number' ? `:${m.metadata['line']}` : ''
    const keyword  = typeof m.metadata?.['keyword'] === 'string' ? m.metadata['keyword'] : 'TODO'
    const location = file ? `${file}${line}` : ''
    const age      = ageDays(m.createdAt)
    return `[${severity}] ${keyword} ${location ? location + ' — ' : ''}${m.content} (${age}d, module=${module})`
  }).join('\n')
}

async function handleGetConventions(args: JsonObj, backend: MemoryBackend): Promise<string> {
  let profiles = await queryConventions(backend)

  if (typeof args['language'] === 'string') {
    profiles = profiles.filter((p) => p.language === args['language'])
  }

  if (profiles.length === 0) return 'No convention profiles found. Run mindr init or make a commit to trigger detection.'

  return profiles.map((p) => {
    const lines = [`Language: ${p.language} (${p.analyzedFiles} files scanned)`]
    for (const c of p.conventions) {
      lines.push(`  ${c.category}: ${c.pattern} — ${c.score}% (${c.sampleCount} samples)`)
    }
    return lines.join('\n')
  }).join('\n\n')
}

async function handleCheckpoint(args: JsonObj, backend: MemoryBackend): Promise<string> {
  const sessionId = String(args['session_id'] ?? '')
  if (!sessionId) return 'Error: session_id is required'
  const summary = typeof args['summary'] === 'string' ? args['summary'] : undefined
  const memory = await checkpointSession(backend, sessionId, summary)
  return `Stored checkpoint ${memory.id.slice(0, 8)} for session ${sessionId}`
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

declare const __MINDR_VERSION__: string
const _SERVER_VERSION = typeof __MINDR_VERSION__ !== 'undefined' ? __MINDR_VERSION__ : '0.0.0'

export function createMindrServer(backend: MemoryBackend): Server {
  const server = new Server(
    { name: 'mindr', version: _SERVER_VERSION },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name
    const args = (request.params.arguments ?? {}) as JsonObj

    let text: string
    try {
      switch (name) {
        case 'mindr:get_context': text = await handleGetContext(args, backend); break
        case 'mindr:remember':    text = await handleRemember(args, backend);   break
        case 'mindr:check_for_bug_patterns': text = await handleCheckForBugPatterns(args, backend); break
        case 'mindr:context_health': text = await handleContextHealth(args); break
        case 'mindr:checkpoint': text = await handleCheckpoint(args, backend); break
        case 'mindr:query':       text = await handleQuery(args, backend);      break
        case 'mindr:get_debt':    text = await handleGetDebt(args, backend);    break
        case 'mindr:get_conventions': text = await handleGetConventions(args, backend); break
        default: text = `Unknown tool: ${name}`
      }
    } catch (err) {
      text = `Error: ${String(err)}`
    }

    return { content: [{ type: 'text' as const, text }] }
  })

  return server
}
