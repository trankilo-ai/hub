import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Agent } from '../types'
import { heartbeatApi } from '../services/api'
import { platformDisplay } from '../constants'

interface Props {
  agent: Agent
  workspaceId?: string
}

const ALIVE_THRESHOLD_MS = 5 * 60 * 1000

function useHeartbeatStatus(agentId: string) {
  const [lastBeat, setLastBeat] = useState<Date | null | undefined>(undefined)

  useEffect(() => {
    heartbeatApi.get(agentId).then((beats) => {
      if (beats.length === 0) { setLastBeat(null); return }
      setLastBeat(new Date(beats[0].timestamp))
    }).catch(() => setLastBeat(null))
  }, [agentId])

  if (lastBeat === undefined) return 'loading'
  if (lastBeat === null) return 'dead'
  return Date.now() - lastBeat.getTime() < ALIVE_THRESHOLD_MS ? 'alive' : 'dead'
}

export function AgentCard({ agent, workspaceId }: Props) {
  const href = workspaceId
    ? `/workspace/${workspaceId}/agent/${agent.id}`
    : `/agent/${agent.id}`

  const status = useHeartbeatStatus(agent.id)

  return (
    <Link to={href} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-shrink-0 w-2.5 h-2.5">
            {status === 'alive' && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            )}
            <span className={`relative block w-2.5 h-2.5 rounded-full ${
              status === 'alive' ? 'bg-emerald-500' :
              status === 'dead' ? 'bg-red-400' :
              'bg-zinc-300'
            }`} />
          </div>
          <h3 className="font-semibold text-zinc-900 text-sm leading-snug truncate">{agent.name}</h3>
        </div>
        <span className={agent.privacy === 'public' ? 'badge-public' : 'badge-private'}>
          {agent.privacy}
        </span>
      </div>

      {agent.description && (
        <p className="text-xs text-zinc-500 line-clamp-2">{agent.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        {agent.platform && (
          <span className="badge bg-zinc-100 text-zinc-600">{platformDisplay(agent.platform)}</span>
        )}
        <span className="text-xs text-zinc-400 ml-auto">v{agent.currentVersion}</span>
      </div>
    </Link>
  )
}
