import { useState, useEffect } from 'react'
import type { Role } from '../types'
import { PLATFORMS } from '../constants'

interface AgentfileFields {
  name: string
  version: string
  platform: string
  model: string
  instructions: string
  tools: string[]
  skills: string[]
}

interface Props {
  content: string
  role: Role | null
  onPublish: (content: string) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}


function parseHcl(content: string): AgentfileFields {
  const name = content.match(/agent\s+"([^"]+)"/)?.[1] ?? ''
  const version = content.match(/version\s*=\s*"([^"]+)"/)?.[1] ?? '0.0.1'
  const platform = content.match(/platform\s*=\s*"([^"]*)"/)?.[1] ?? ''
  const model = content.match(/model\s*=\s*"([^"]+)"/)?.[1] ?? 'gpt-4o'
  const rawInstructions = content.match(/instructions\s*=\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? ''
  const instructions = rawInstructions.replace(/\\n/g, '\n').replace(/\\"/g, '"')
  const toolsRaw = content.match(/tools\s*=\s*\[([^\]]*)\]/)?.[1] ?? ''
  const skillsRaw = content.match(/skills\s*=\s*\[([^\]]*)\]/)?.[1] ?? ''
  const tools = toolsRaw.match(/"([^"]+)"/g)?.map(t => t.slice(1, -1)) ?? []
  const skills = skillsRaw.match(/"([^"]+)"/g)?.map(s => s.slice(1, -1)) ?? []
  return { name, version, platform, model, instructions, tools, skills }
}

function serializeHcl(f: AgentfileFields): string {
  const tools = f.tools.map(t => `"${t}"`).join(', ')
  const skills = f.skills.map(s => `"${s}"`).join(', ')
  const instructions = f.instructions.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
  return `agent "${f.name}" {\n  version      = "${f.version}"\n  platform     = "${f.platform}"\n  model        = "${f.model}"\n  instructions = "${instructions}"\n  tools        = [${tools}]\n  skills       = [${skills}]\n}\n`
}


const KNOWN_PLATFORMS = PLATFORMS.filter(p => p !== 'Other')

function platformToSelectVal(platform: string): string {
  if (platform === '') return ''
  return KNOWN_PLATFORMS.includes(platform) ? platform : 'Other'
}

export function AgentfileEditor({ content, role, onPublish, onDirtyChange }: Props) {
  const [fields, setFields] = useState<AgentfileFields>(() => parseHcl(content))
  const [platformSelect, setPlatformSelect] = useState(() => platformToSelectVal(parseHcl(content).platform))
  const [publishing, setPublishing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty])

  async function handleCopy() {
    await navigator.clipboard.writeText(serializeHcl(fields))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    const parsed = parseHcl(content)
    setFields(parsed)
    setPlatformSelect(platformToSelectVal(parsed.platform))
    setDirty(false)
  }, [content])

  const isViewer = role === 'Viewer'

  function update<K extends keyof AgentfileFields>(key: K, value: AgentfileFields[K]) {
    setFields(f => ({ ...f, [key]: value }))
    setDirty(true)
  }

  async function handlePublishConfirm() {
    setPublishing(true)
    setShowConfirm(false)
    try {
      await onPublish(serializeHcl(fields))
      setDirty(false)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500">Agentfile</span>
          <div className="flex items-center rounded-md border border-zinc-200 overflow-hidden text-xs">
            <button
              onClick={() => setTextMode(false)}
              className={`px-2.5 py-1 transition-colors ${!textMode ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
            >
              Form
            </button>
            <button
              onClick={() => setTextMode(true)}
              className={`px-2.5 py-1 transition-colors ${textMode ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
            >
              Text
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {!isViewer && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={publishing}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        )}
        {isViewer && (
          <span className="badge bg-zinc-100 text-zinc-500 text-xs">View only</span>
        )}
      </div>

      {textMode ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <pre className="text-xs font-mono text-zinc-700 whitespace-pre leading-relaxed">
            {serializeHcl(fields)}
          </pre>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <div className="flex flex-col gap-5 max-w-2xl">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Agent Name</label>
              <input
                className="input font-mono"
                value={fields.name}
                onChange={e => update('name', e.target.value)}
                disabled={isViewer}
                placeholder="My Agent"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Version</label>
                <input
                  className="input font-mono"
                  value={fields.version}
                  onChange={e => update('version', e.target.value)}
                  disabled={isViewer}
                  placeholder="0.0.1"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Platform</label>
                <select
                  className="input"
                  value={platformSelect}
                  onChange={e => {
                    setPlatformSelect(e.target.value)
                    if (e.target.value !== 'Other') update('platform', e.target.value)
                    else update('platform', '')
                  }}
                  disabled={isViewer}
                >
                  <option value="">Select platform…</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {platformSelect === 'Other' && (
                  <input
                    className="input font-mono mt-1"
                    value={fields.platform}
                    onChange={e => update('platform', e.target.value)}
                    disabled={isViewer}
                    placeholder="Specify platform"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Model</label>
                <input
                  className="input font-mono"
                  value={fields.model}
                  onChange={e => update('model', e.target.value)}
                  disabled={isViewer}
                  placeholder="gpt-4o"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Instructions</label>
              <textarea
                className="input resize-none font-mono text-sm leading-relaxed"
                rows={6}
                value={fields.instructions}
                onChange={e => update('instructions', e.target.value)}
                disabled={isViewer}
                placeholder="You are a helpful assistant."
              />
            </div>

          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h3 className="font-semibold text-zinc-900">Publish agent?</h3>
            <p className="text-sm text-zinc-600">
              This will make the current Agentfile version live. Are you sure?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handlePublishConfirm} className="btn-primary">Publish 🦥</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
