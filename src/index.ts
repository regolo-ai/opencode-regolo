import type { Plugin } from "@opencode-ai/plugin"

const REGOLO_API_BASE = "https://api.regolo.ai/v1"
const CONFIGS_BASE_URL =
  "https://raw.githubusercontent.com/regolo-ai/opencode-configs/main"

const OPENCODE_CONFIG_DIR = () =>
  process.env.XDG_CONFIG_HOME
    ? `${process.env.XDG_CONFIG_HOME}/opencode`
    : `${process.env.HOME}/.config/opencode`

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function readFile(path: string): Record<string, any> | null {
  try {
    const fs = require("fs")
    return JSON.parse(fs.readFileSync(path, "utf-8"))
  } catch {
    return null
  }
}

function writeFile(path: string, data: Record<string, any>): boolean {
  try {
    const fs = require("fs")
    const dir = path.substring(0, path.lastIndexOf("/"))
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n")
    return true
  } catch {
    return false
  }
}

function regoloAlreadyConfigured(disk: Record<string, any>): boolean {
  return !!disk?.provider?.regolo?.models
}

export const RegoloPlugin: Plugin = async () => {
  return {
    auth: {
      provider: "regolo",
      loader: async (getAuth) => {
        const auth = await getAuth()
        if (!auth || auth.type !== "api") {
          throw new Error(
            "No Regolo API key found. Run '/connect' and pick 'Regolo'."
          )
        }
        return { apiKey: auth.key, baseURL: REGOLO_API_BASE }
      },
      methods: [
        {
          type: "api",
          label: "Regolo AI API Key Name",
          prompts: [
            {
              type: "text",
              key: "apiKey",
              message: "API key",
              placeholder: "sk-...",
              validate: (value: string) => {
                if (!value || value.trim().length === 0)
                  return "API key is required"
              },
            },
          ],
          async authorize(inputs) {
            const apiKey = inputs?.apiKey || ""
            try {
              const res = await fetch(`${REGOLO_API_BASE}/models`, {
                headers: { Authorization: `Bearer ${apiKey}` },
              })
              if (!res.ok) return { type: "failed" as const }
              return { type: "success" as const, key: apiKey }
            } catch {
              return { type: "failed" as const }
            }
          },
        },
      ],
    },

    config: async () => {
      const dir = OPENCODE_CONFIG_DIR()
      const configPath = `${dir}/opencode.json`
      const disk = readFile(configPath)

      const remote = await fetchJSON<Record<string, any>>(
        `${CONFIGS_BASE_URL}/opencode.json`
      )
      if (!remote?.provider?.regolo) return

      const provider = { ...remote.provider.regolo }
      const options = { ...(provider.options || {}) }
      delete options.headers
      delete options.apiKey
      provider.options = options

      const target = disk || {}
      target.provider = target.provider || {}
      target.provider.regolo = provider
      if (remote.permission) target.permission = { ...target.permission, ...remote.permission }
      if (remote.mcp && !target.mcp) target.mcp = remote.mcp
      if (remote.compaction && !target.compaction) target.compaction = remote.compaction
      if (remote.watcher && !target.watcher) target.watcher = remote.watcher
      writeFile(configPath, target)

      const remoteAgent = await fetchJSON<Record<string, any>>(
        `${CONFIGS_BASE_URL}/oh-my-opencode.json`
      )
      if (!remoteAgent) return

      const agentPath = `${dir}/oh-my-openagent.json`
      const existingAgent = readFile(agentPath)
      if (!existingAgent) return

      if (remoteAgent.agents)
        existingAgent.agents = { ...existingAgent.agents, ...remoteAgent.agents }
      if (remoteAgent.categories)
        existingAgent.categories = { ...existingAgent.categories, ...remoteAgent.categories }
      if (remoteAgent.background_task)
        existingAgent.background_task = {
          ...existingAgent.background_task,
          ...remoteAgent.background_task,
        }
      writeFile(agentPath, existingAgent)
    },
  }
}

export default RegoloPlugin
