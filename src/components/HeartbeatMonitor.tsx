import { useState } from 'react'
import type { HeartbeatEntry } from '../types'

const PERIODS = [
  { label: '1H',  hours: 1,   buckets: 12, bucketMins: 5   },
  { label: '6H',  hours: 6,   buckets: 18, bucketMins: 20  },
  { label: '24H', hours: 24,  buckets: 24, bucketMins: 60  },
  { label: '7D',  hours: 168, buckets: 28, bucketMins: 360 },
]

interface Props {
  beats: HeartbeatEntry[]
}

interface Bucket {
  label: string
  count: number
  from: Date
  to: Date
}

export function timeSince(ts: string): string {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatBucketTime(d: Date, bucketMins: number): string {
  if (bucketMins < 60) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (bucketMins < 1440) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function buildBuckets(beats: HeartbeatEntry[], hours: number, buckets: number, bucketMins: number): Bucket[] {
  const now = Date.now()
  const windowMs = hours * 3_600_000
  const start = now - windowMs
  const bucketMs = windowMs / buckets

  const result: Bucket[] = Array.from({ length: buckets }, (_, i) => {
    const from = new Date(start + i * bucketMs)
    const to   = new Date(start + (i + 1) * bucketMs)
    return { label: formatBucketTime(from, bucketMins), count: 0, from, to }
  })

  for (const b of beats) {
    const t = new Date(b.timestamp).getTime()
    if (t < start) continue
    const idx = Math.min(buckets - 1, Math.floor((Math.min(t, now) - start) / bucketMs))
    result[idx].count++
  }

  return result
}

function AvailabilityChart({
  buckets,
  periodLabel,
}: {
  buckets: Bucket[]
  periodLabel: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = buckets.filter(b => b.count > 0).length
  const pct = Math.round((active / buckets.length) * 100)

  const hoveredBucket = hovered !== null ? buckets[hovered] : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-amber-500' : 'text-zinc-400'}`}>
            {pct}% active
          </span>
          <span className="text-xs text-zinc-400">{active}/{buckets.length} periods</span>
        </div>
        {hoveredBucket ? (
          <span className="text-xs text-zinc-500 tabular-nums">
            {hoveredBucket.from.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' — '}
            {hoveredBucket.count > 0
              ? <span className="text-emerald-600 font-medium">{hoveredBucket.count} beat{hoveredBucket.count !== 1 ? 's' : ''}</span>
              : <span className="text-zinc-400">no activity</span>
            }
          </span>
        ) : (
          <span className="text-xs text-zinc-300">hover for details</span>
        )}
      </div>

      <div className="flex gap-0.5 h-10">
        {buckets.map((b, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`flex-1 rounded-sm cursor-default transition-all duration-100 ${
              b.count > 0
                ? hovered === i ? 'bg-emerald-300' : 'bg-emerald-400'
                : hovered === i ? 'bg-zinc-300'   : 'bg-zinc-200'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>-{periodLabel}</span>
        <span>now</span>
      </div>
    </div>
  )
}

export function HeartbeatMonitor({ beats }: Props) {
  const [period, setPeriod] = useState(PERIODS[2])
  const [view, setView] = useState<'graph' | 'table'>('graph')

  const windowMs = period.hours * 3_600_000
  const filtered = beats.filter(b => new Date(b.timestamp).getTime() >= Date.now() - windowMs)
  const buckets = buildBuckets(beats, period.hours, period.buckets, period.bucketMins)

  return (
    <div className="flex flex-col h-full">
      {beats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-300" />
          <p className="text-xs text-zinc-400">No heartbeats recorded yet</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Heartbeats</h3>
              <span className="text-xs text-zinc-400">({filtered.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md border border-zinc-200 overflow-hidden text-xs">
                {PERIODS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 transition-colors ${
                      period.label === p.label
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center rounded-md border border-zinc-200 overflow-hidden text-xs">
                <button
                  onClick={() => setView('graph')}
                  className={`px-2.5 py-1 transition-colors ${view === 'graph' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
                >
                  Graph
                </button>
                <button
                  onClick={() => setView('table')}
                  className={`px-2.5 py-1 transition-colors ${view === 'table' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>

          {view === 'graph' ? (
            <div className="px-4 py-5">
              <AvailabilityChart buckets={buckets} periodLabel={period.label} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-8">No heartbeats in this period</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-zinc-500 font-medium">Time</th>
                      <th className="px-4 py-2 text-left text-zinc-500 font-medium">Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filtered.map((b, i) => (
                      <tr key={i} className="hover:bg-zinc-50">
                        <td className="px-4 py-2.5 text-zinc-600">{formatDateTime(b.timestamp)}</td>
                        <td className="px-4 py-2.5 font-mono text-zinc-700">
                          {(b.metadata?.version as string) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
