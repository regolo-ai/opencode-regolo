import type { Plugin } from "@opencode-ai/plugin"

const REGOLO_CONFIGS_REPO = "regolo-ai/opencode-configs"
const REGOLO_API_BASE = "https://api.regolo.ai/v1"
const OPENCODE_CONFIG_DIR = () =>
  process.env.XDG_CONFIG_HOME
    ? `${process.env.XDG_CONFIG_HOME}/opencode`
    : `${process.env.HOME}/.config/opencode`

const GITHUB_RAW = (path: string) =>
  `https://raw.githubusercontent.com/${REGOLO_CONFIGS_REPO}/main/${path}`

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
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n")
    return true
  } catch (err) {
    console.log(`[opencode-regolo] Write error: ${err}`)
    return false
  }
}

function sanitizeOptions(raw: Record<string, any>): Record<string, any> {
  const options = { ...(raw.options || {}) }
  delete options.headers
  delete options.apiKey
  return options
}

function mergeRemoteInto(
  target: Record<string, any>,
  remote: Record<string, any>
): void {
  if (remote.provider?.regolo) {
    const provider = { ...remote.provider.regolo }
    provider.options = sanitizeOptions(provider)
    target.provider = target.provider || {}
    target.provider.regolo = provider
  }
  if (remote.permission) {
    target.permission = { ...target.permission, ...remote.permission }
  }
  if (remote.mcp) {
    target.mcp = { ...target.mcp, ...remote.mcp }
  }
  if (remote.compaction && !target.compaction) {
    target.compaction = remote.compaction
  }
  if (remote.watcher && !target.watcher) {
    target.watcher = remote.watcher
  }
}

export const RegoloPlugin: Plugin = async (ctx) => {
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
          label: "Regolo AI API Key",
          prompts: [
            {
              type: "text",
              key: "apiKey",
              message: "Enter your Regolo AI API key",
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

    config: async (input) => {
      const remoteConfig = await fetchJSON<Record<string, any>>(
        GITHUB_RAW("opencode.json")
      )
      if (!remoteConfig) {
        console.log("[opencode-regolo] Failed to download opencode.json")
        return
      }

      mergeRemoteInto(input, remoteConfig)

      const configPath = `${OPENCODE_CONFIG_DIR()}/opencode.json`
      const diskConfig = readFile(configPath) || {}
      mergeRemoteInto(diskConfig, remoteConfig)
      const ok = writeFile(configPath, diskConfig)
      console.log(
        `[opencode-regolo] ${ok ? "Updated" : "Failed to update"} ${configPath}`
      )

      const agentPath = `${OPENCODE_CONFIG_DIR()}/oh-my-openagent.json`
      const remoteAgent = await fetchJSON<Record<string, any>>(
        GITHUB_RAW("oh-my-opencode.json")
      )
      if (!remoteAgent) {
        console.log("[opencode-regolo] Failed to download oh-my-opencode.json")
        return
      }

      const existingAgent = readFile(agentPath)
      if (!existingAgent) {
        console.log(
          `[opencode-regolo] ${agentPath} not found, skipping agent merge`
        )
        return
      }

      const merged = { ...existingAgent }
      if (remoteAgent.agents)
        merged.agents = { ...merged.agents, ...remoteAgent.agents }
      if (remoteAgent.categories)
        merged.categories = { ...merged.categories, ...remoteAgent.categories }
      if (remoteAgent.background_task)
        merged.background_task = {
          ...merged.background_task,
          ...remoteAgent.background_task,
        }

      const agentOk = writeFile(agentPath, merged)
      console.log(
        `[opencode-regolo] ${agentOk ? "Updated" : "Failed to update"} ${agentPath}`
      )
    },
  }
}

export default RegoloPlugin
