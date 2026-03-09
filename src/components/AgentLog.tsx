import { useState } from 'react'
import type { LogEntry } from '../types'

const COMMENT_TRUNCATE = 100

interface Props {
  entries: LogEntry[]
  loading?: boolean
}

export function AgentLog({ entries, loading }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggleExpand(i: number) {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(i) ? s.delete(i) : s.add(i)
      return s
    })
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-200">
        <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Activity log</h3>
      </div>

      {loading && (
        <p className="text-xs text-zinc-400 px-4 py-4 text-center">🦥 Loading…</p>
      )}

      {!loading && entries.length === 0 && (
        <p className="text-xs text-zinc-400 px-4 py-4 text-center">No activity yet</p>
      )}

      {!loading && (
        <div className="divide-y divide-zinc-100 overflow-y-auto">
          {entries.map((e, i) => {
            const isLong = e.comment && e.comment.length > COMMENT_TRUNCATE
            const isExpanded = expanded.has(i)
            return (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-zinc-800">{e.description}</span>
                  <span className="text-[11px] text-zinc-400">
                    {new Date(e.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">{e.user}</p>
                {e.comment && (
                  <div className="mt-1">
                    <p className="text-[11px] text-zinc-400 italic">
                      "{isLong && !isExpanded
                        ? e.comment.slice(0, COMMENT_TRUNCATE) + '…'
                        : e.comment}"
                    </p>
                    {isLong && (
                      <button
                        onClick={() => toggleExpand(i)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 mt-0.5 transition-colors"
                      >
                        {isExpanded ? 'less' : 'more'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
