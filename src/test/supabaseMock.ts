import { vi } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fake accepts any row shape
type Row = Record<string, any>

export interface RecordedCall {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  payload?: unknown
  filters: [string, string, unknown][]
}

/**
 * Minimal in-memory stand-in for the supabase-js query builder.
 * Supports the chain shapes Planora uses and records every write.
 */
export function createSupabaseMock() {
  const tables: Record<string, Row[]> = {}
  const calls: RecordedCall[] = []
  let counter = 0

  function builder(table: string) {
    const state: RecordedCall & { single: boolean } = {
      table,
      op: 'select',
      filters: [],
      single: false,
    }
    const chain: Record<string, unknown> = {}
    const passthrough = ['select', 'order', 'limit', 'gte', 'lte', 'neq', 'in', 'is']
    for (const method of passthrough) chain[method] = () => chain
    chain.eq = (column: string, value: unknown) => {
      state.filters.push(['eq', column, value])
      return chain
    }
    chain.insert = (payload: unknown) => {
      state.op = 'insert'
      state.payload = payload
      return chain
    }
    chain.update = (payload: unknown) => {
      state.op = 'update'
      state.payload = payload
      return chain
    }
    chain.delete = () => {
      state.op = 'delete'
      return chain
    }
    chain.single = () => {
      state.single = true
      return chain
    }
    chain.maybeSingle = chain.single
    chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
      try {
        calls.push({
          table: state.table,
          op: state.op,
          payload: state.payload,
          filters: state.filters,
        })
        const rows = (tables[table] ?? []).filter((row) =>
          state.filters.every(([, col, val]) => !(col in row) || row[col] === val),
        )
        let data: unknown
        if (state.op === 'select') data = state.single ? (rows[0] ?? null) : rows
        else if (state.op === 'insert') {
          const items = (Array.isArray(state.payload) ? state.payload : [state.payload]).map(
            (p) => ({
              id: `new-${++counter}`,
              created_at: new Date().toISOString(),
              ...(p as Row),
            }),
          )
          tables[table] = [...(tables[table] ?? []), ...items]
          data = state.single ? items[0] : items
        } else if (state.op === 'update') {
          const updated = rows.map((r) => Object.assign(r, state.payload as Row))
          data = state.single ? (updated[0] ?? null) : updated
        } else {
          tables[table] = (tables[table] ?? []).filter((r) => !rows.includes(r))
          data = null
        }
        resolve({ data, error: null })
      } catch (err) {
        reject(err)
      }
    }
    return chain
  }

  const client = {
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn(async (_fn: string, _args: unknown) => ({
      data: 'project-1',
      error: null as unknown,
    })),
    functions: { invoke: vi.fn(async () => ({ data: { job_id: 'job-1' }, error: null })) },
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(async () => ({ data: [], error: null })),
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl: 'https://example.test/file' },
          error: null,
        })),
      })),
    },
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  }

  return {
    client,
    tables,
    calls,
    reset() {
      for (const key of Object.keys(tables)) delete tables[key]
      calls.length = 0
      counter = 0
      client.rpc.mockClear()
      client.from.mockClear()
    },
    writes: (table: string) => calls.filter((c) => c.table === table && c.op !== 'select'),
  }
}
