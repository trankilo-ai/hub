import type { AgentVersion } from '../types'

interface Props {
  versions: AgentVersion[]
  currentVersion: string
}

function formatSavedAt(savedAt: unknown): string {
  if (!savedAt) return ''
  if (typeof savedAt === 'string' || typeof savedAt === 'number') {
    const d = new Date(savedAt)
    return isNaN(d.getTime()) ? '' : d.toLocaleString()
  }
  if (typeof savedAt === 'object' && '_seconds' in (savedAt as object)) {
    return new Date((savedAt as { _seconds: number })._seconds * 1000).toLocaleString()
  }
  return ''
}

export function VersionHistory({ versions, currentVersion }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-200">
        <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Version history</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 && (
          <p className="text-xs text-zinc-400 px-4 py-6 text-center">🦥 No versions yet</p>
        )}
        {versions.map((v) => (
          <div
            key={v.id}
            className={`w-full px-4 py-3 border-b border-zinc-100 ${v.version === currentVersion ? 'bg-zinc-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-zinc-800">v{v.version}</span>
              {v.version === currentVersion && (
                <span className="badge badge-public text-[10px]">current</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">{v.savedBy}</p>
            <p className="text-[11px] text-zinc-400">{formatSavedAt(v.savedAt)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
