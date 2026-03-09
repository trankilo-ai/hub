import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AgentfileEditor } from '../components/AgentfileEditor'
import { VersionHistory } from '../components/VersionHistory'
import { Playground } from '../components/Playground'
import { PrivacyToggle } from '../components/PrivacyToggle'
import { HeartbeatMonitor, timeSince } from '../components/HeartbeatMonitor'
import { AgentLog } from '../components/AgentLog'
import { agentsApi, agentfileApi, heartbeatApi, logsApi } from '../services/api'
import type { Agent, AgentVersion, HeartbeatEntry, LogEntry, Role } from '../types'

type Tab = 'editor' | 'playground' | 'monitor' | 'log'

export function AgentDetailPage() {
  const { workspaceId, agentId } = useParams<{ workspaceId: string; agentId: string }>()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [agentfileContent, setAgentfileContent] = useState('')
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [beats, setBeats] = useState<HeartbeatEntry[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentfileDirty, setAgentfileDirty] = useState(false)
  const [privacyDirty, setPrivacyDirty] = useState(false)
  const isPageDirty = agentfileDirty || privacyDirty
  const isPageDirtyRef = useRef(isPageDirty)

  useEffect(() => { isPageDirtyRef.current = isPageDirty }, [isPageDirty])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isPageDirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    if (!isPageDirty) return
    window.history.pushState({ guardDirty: true }, '', window.location.href)
    const handlePopState = () => {
      if (!isPageDirtyRef.current) return
      if (window.confirm('You have unpublished changes. Leave anyway?')) {
        window.history.back()
      } else {
        window.history.pushState({ guardDirty: true }, '', window.location.href)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isPageDirty])

  const currentRole: Role = 'Editor' as Role

  async function load() {
    if (!agentId) return
    setLoading(true)
    try {
      const [a, af, vers, hb, lg] = await Promise.all([
        agentsApi.get(agentId),
        agentfileApi.get(agentId).catch(() => ({ content: '' })),
        agentfileApi.versions(agentId).catch(() => []),
        heartbeatApi.get(agentId).catch(() => []),
        logsApi.get(agentId).catch(() => []),
      ])
      setAgent(a)
      setAgentfileContent(af.content)
      setVersions(vers)
      setBeats(hb)
      setLogs(lg)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [agentId])

  async function handlePublish(content: string, comment?: string) {
    if (!agentId || !agent) return
    await agentfileApi.save(agentId, content)
    setAgentfileContent(content)
    if (privacyDirty) await agentsApi.updatePrivacy(agentId, agent.privacy)
    await agentsApi.publish(agentId, comment)
    const [vers, a, lg] = await Promise.all([
      agentfileApi.versions(agentId),
      agentsApi.get(agentId),
      logsApi.get(agentId),
    ])
    setVersions(vers)
    setAgent(a)
    setLogs(lg)
    setPrivacyDirty(false)
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-zinc-400 text-sm">
        🦥 Loading agent…
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-red-600 text-sm">{error ?? 'Agent not found'}</p>
      </div>
    )
  }

  const heartbeatStatus: 'live' | 'dead' | 'none' = beats.length === 0
    ? 'none'
    : Date.now() - new Date(beats[0].timestamp).getTime() < 5 * 60_000
      ? 'live'
      : 'dead'

  const heartbeatDotProps: Record<'live' | 'dead' | 'none', { bg: string; ping: boolean; label: string }> = {
    live: { bg: 'bg-emerald-500', ping: true,  label: 'Live — last heartbeat within 5 minutes' },
    dead: { bg: 'bg-red-400',     ping: false, label: `Offline — last heartbeat ${beats.length > 0 ? timeSince(beats[0].timestamp) : ''}` },
    none: { bg: 'bg-zinc-300',    ping: false, label: 'Never sent a heartbeat' },
  }

  const tabs: { id: Tab; label: React.ReactNode }[] = [
    { id: 'editor', label: 'Agentfile' },
    { id: 'playground', label: 'Playground 🦥' },
    {
      id: 'monitor',
      label: (
        <span className="flex items-center gap-1.5">
          Heartbeats
          <span
            className="relative flex-shrink-0 w-2 h-2"
            title={heartbeatDotProps[heartbeatStatus].label}
          >
            {heartbeatDotProps[heartbeatStatus].ping && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            )}
            <span className={`relative block w-2 h-2 rounded-full ${heartbeatDotProps[heartbeatStatus].bg}`} />
          </span>
        </span>
      ),
    },
    { id: 'log', label: 'Activity Log' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4 h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const dest = workspaceId ? `/workspace/${workspaceId}` : '/'
                if (!isPageDirty || window.confirm('You have unpublished changes. Leave anyway?')) {
                  navigate(dest)
                }
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              ← Back
            </button>
            <span className="text-zinc-300">/</span>
            <h1 className="text-lg font-semibold text-zinc-900">{agent.name}</h1>
            {isPageDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unpublished changes" />}
            <span className={agent.privacy === 'public' ? 'badge-public' : 'badge-private'}>
              {agent.privacy}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            v{agent.currentVersion} · {agent.platform}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrivacyToggle
            privacy={agent.privacy}
            onChange={(p) => {
              setAgent({ ...agent, privacy: p })
              setPrivacyDirty(true)
            }}
            disabled={currentRole === 'Viewer'}
          />
        </div>
      </div>

      <div className="flex border-b border-zinc-200 gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        {activeTab === 'editor' && (
          <>
            <div className="flex-1 min-w-0 border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
              <AgentfileEditor
                content={agentfileContent}
                role={currentRole}
                onPublish={handlePublish}
                onDirtyChange={setAgentfileDirty}
              />
            </div>
            <div className="w-64 flex-shrink-0 border border-zinc-200 rounded-xl overflow-hidden">
              <VersionHistory
                versions={versions}
                currentVersion={agent.currentVersion}
              />
            </div>
          </>
        )}

        {activeTab === 'playground' && (
          <div className="flex-1 border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
            <Playground agentfileContent={agentfileContent} />
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="flex-1 border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
            <HeartbeatMonitor beats={beats} />
          </div>
        )}

        {activeTab === 'log' && (
          <div className="flex-1 border border-zinc-200 rounded-xl overflow-hidden">
            <AgentLog entries={logs} />
          </div>
        )}
      </div>
    </div>
  )
}
