import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AgentCard } from '../components/AgentCard'
import { WorkspaceMembers } from '../components/WorkspaceMembers'
import { workspacesApi, agentsApi } from '../services/api'
import { useAuthStore } from '../store/auth'
import type { Workspace, Agent, Role } from '../types'
import logo from '../assets/logo.png'
import { PLATFORMS } from '../constants'

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuthStore()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentPlatform, setNewAgentPlatform] = useState('')
  const [newAgentPlatformOther, setNewAgentPlatformOther] = useState('')
  const [newAgentPrivacy, setNewAgentPrivacy] = useState<'private' | 'public'>('private')
  const [creating, setCreating] = useState(false)

  const currentRole: Role = workspace && user
    ? (workspace.members[user.uid] ?? 'Viewer')
    : 'Viewer'

  async function load() {
    if (!workspaceId) return
    setLoading(true)
    try {
      const ws = await workspacesApi.get(workspaceId)
      setWorkspace(ws)
      setAgents(await workspacesApi.agents(workspaceId))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [workspaceId])

  async function handleCreateAgent(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId) return
    setCreating(true)
    try {
      await agentsApi.create({
        name: newAgentName,
        platform: newAgentPlatform === 'Other' ? newAgentPlatformOther : newAgentPlatform,
        description: '',
        privacy: newAgentPrivacy,
        workspaceId,
      })
      setNewAgentName('')
      setNewAgentPlatform('')
      setNewAgentPlatformOther('')
      setNewAgentPrivacy('private')
      setShowCreateAgent(false)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-zinc-400 text-sm">
        🦥 Loading workspace…
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      <div className="flex flex-col items-center mb-2">
        <img src={logo} alt="trankilo-ai" className="w-64 h-auto mb-6" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{workspace?.name}</h1>
        </div>
        {(currentRole === 'Admin' || currentRole === 'Editor') && (
          <button onClick={() => setShowCreateAgent(true)} className="btn-primary">
            + New agent
          </button>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Agents ({agents.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} workspaceId={workspaceId} />
          ))}
        </div>
      </div>

      {workspace && user && (
        <WorkspaceMembers
          workspace={workspace}
          currentUserId={user.uid}
          currentRole={currentRole}
          onUpdate={load}
        />
      )}

      {showCreateAgent && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h3 className="font-semibold text-zinc-900">Create agent</h3>
            <form onSubmit={handleCreateAgent} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Agent name"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                required
                className="input"
              />
              <select
                value={newAgentPlatform}
                onChange={(e) => { setNewAgentPlatform(e.target.value); setNewAgentPlatformOther('') }}
                className="input"
              >
                <option value="">Select platform…</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {newAgentPlatform === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify platform"
                  value={newAgentPlatformOther}
                  onChange={(e) => setNewAgentPlatformOther(e.target.value)}
                  required
                  className="input"
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                {(['private', 'public'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setNewAgentPrivacy(option)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      newAgentPrivacy === option
                        ? option === 'private'
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {option === 'private' ? (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {option === 'private' ? 'Private' : 'Public'}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCreateAgent(false); setNewAgentPlatform(''); setNewAgentPlatformOther(''); setNewAgentPrivacy('private') }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newAgentName.trim() || !newAgentPlatform || (newAgentPlatform === 'Other' && !newAgentPlatformOther.trim())} className="btn-primary">
                  {creating ? '🦥 Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="text-xs text-zinc-400">
        <Link to="/" className="hover:text-zinc-600">← Back to Agent hub</Link>
      </div>
    </div>
  )
}
