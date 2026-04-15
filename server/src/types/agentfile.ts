 import yaml from 'yaml'

const DEFAULT_VERSION = '0.0.1'

export class Agentfile {
  name: string
  version: string
  platform: string
  model: string
  instructions: string

  constructor(name: string, version: string, platform: string, model: string, instructions: string) {
    this.name = name
    this.version = version
    this.platform = platform
    this.model = model
    this.instructions = instructions
  }

  static parse = (content: string): Agentfile | null => {
    try {
      const parsed = yaml.parse(content) as Agentfile
      return new Agentfile(
        parsed.name,
        parsed.version,
        parsed.platform,
        parsed.model,
        parsed.instructions,
      )
    } catch {
      return null
    }
  }

  static getPath = (agentId: string, fileName: string): string => `agentfiles/${agentId}/${fileName}`

  static stringify = (agentfile: Agentfile): string => yaml.stringify(agentfile)
}
