export const PLATFORMS = [
  'LangChain',
  'Flowise',
  'Zapier',
  'CrewAI',
  'AutoGen',
  'OpenAI Agents SDK',
  'Google Agent Development Kit',
  'Claude Agent SDK',
  'n8n',
  'Other',
]

const PLATFORM_VALUE_TO_LABEL: Record<string, string> = {
  langchain: 'LangChain',
  'langchain-ts': 'LangChain',
  flowise: 'Flowise',
  zapier: 'Zapier',
  n8n: 'n8n',
  'google-adk': 'Google Agent Development Kit',
  'openai-agents-sdk': 'OpenAI Agents SDK',
  crewai: 'CrewAI',
  autogen: 'AutoGen',
  other: 'Other',
}

const PLATFORM_LABEL_TO_VALUE: Record<string, string> = {
  LangChain: 'langchain',
  Flowise: 'flowise',
  Zapier: 'zapier',
  n8n: 'n8n',
  'Google Agent Development Kit': 'google-adk',
  'OpenAI Agents SDK': 'openai-agents-sdk',
  CrewAI: 'crewai',
  AutoGen: 'autogen',
  Other: 'other',
}

export function platformDisplay(platform: string): string {
  if (!platform) return ''
  return PLATFORM_VALUE_TO_LABEL[platform] ?? platform
}

export function platformValue(label: string): string {
  if (!label || label === 'Other') return label === 'Other' ? 'other' : ''
  return PLATFORM_LABEL_TO_VALUE[label] ?? label
}
