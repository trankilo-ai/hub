import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { agentsApi, agentfileApi } from '../services/api'
import type { Agent } from '../types'
import { platformDisplay } from '../constants'

export function PublicAgentPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!agentId) return
    setLoading(true)
    Promise.all([agentsApi.get(agentId), agentfileApi.get(agentId)])
      .then(([a, af]) => {
        setAgent(a)
        setContent(af.content)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [agentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-zinc-400 text-sm">
        🦥 Loading…
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600 text-sm">{error ?? 'Agent not found or access denied'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold text-zinc-900">{agent.name}</h1>
          <span className={agent.privacy === 'public' ? 'badge-public' : 'badge-private'}>
            {agent.privacy}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {agent.platform && <span className="badge bg-zinc-100 text-zinc-600">{platformDisplay(agent.platform)}</span>}
          <span>v{agent.currentVersion}</span>
          <span>Updated {new Date(agent.updatedAt).toLocaleDateString()}</span>
        </div>
        {agent.description && (
          <p className="text-sm text-zinc-600 mt-3">{agent.description}</p>
        )}
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500">Agentfile.hcl</span>
          <span className="badge bg-zinc-100 text-zinc-500 text-[10px]">read-only</span>
        </div>
        <Editor
          height="400px"
          defaultLanguage="hcl"
          value={content}
          options={{
            readOnly: true,
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            wordWrap: 'on',
          }}
          theme="vs-light"
        />
      </div>

      <div className="text-xs text-zinc-400">
        <Link to="/" className="hover:text-zinc-600">← Back to registry</Link>
      </div>
    </div>
  )
}
