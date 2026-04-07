import type { Plugin } from "@opencode-ai/plugin"

const REGOLO_CONFIGS_REPO = "regolo-ai/opencode-configs"
const REGOLO_CONFIGS_BRANCH = "main"
const REGOLO_API_BASE = "https://api.regolo.ai/v1"
const OPENCODE_CONFIG_PATH = () => {
  const dir = process.env.XDG_CONFIG_HOME
    ? `${process.env.XDG_CONFIG_HOME}/opencode`
    : `${process.env.HOME}/.config/opencode`
  return `${dir}/opencode.json`
}
const OPENAGENT_CONFIG_PATH = () => {
  const dir = process.env.XDG_CONFIG_HOME
    ? `${process.env.XDG_CONFIG_HOME}/opencode`
    : `${process.env.HOME}/.config/opencode`
  return `${dir}/oh-my-openagent.json`
}

const GITHUB_RAW = (path: string) =>
  `https://raw.githubusercontent.com/${REGOLO_CONFIGS_REPO}/${REGOLO_CONFIGS_BRANCH}/${path}`

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
  } catch {
    return false
  }
}

function fileExists(path: string): boolean {
  try {
    const fs = require("fs")
    return fs.existsSync(path)
  } catch {
    return false
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
            "No Regolo API key found. Run '/connect' and pick 'Regolo' to set up."
          )
        }
        return {
          apiKey: auth.key,
          baseURL: REGOLO_API_BASE,
        }
      },
      methods: [
        {
          type: "api",
          label: "Regolo AI API Key",
          prompts: [
            {
              type: "text",
              key: "name",
              message: "Name this key",
              placeholder: "Regolo",
            },
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
              if (!res.ok) {
                return { type: "failed" as const }
              }
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
      if (!remoteConfig) return

      if (remoteConfig.provider?.regolo) {
        const provider = { ...remoteConfig.provider.regolo }
        const options = { ...(provider.options || {}) }
        delete options.headers
        delete options.apiKey
        provider.options = options
        input.provider = input.provider || {}
        input.provider.regolo = provider
      }

      if (remoteConfig.permission) {
        input.permission = { ...input.permission, ...remoteConfig.permission }
      }
      if (remoteConfig.mcp) {
        input.mcp = { ...input.mcp, ...remoteConfig.mcp }
      }
      if (remoteConfig.compaction) {
        input.compaction = remoteConfig.compaction
      }
      if (remoteConfig.watcher) {
        input.watcher = remoteConfig.watcher
      }

      const configPath = OPENCODE_CONFIG_PATH()
      const existing = readFile(configPath) || {}
      const toWrite = { ...existing }

      if (remoteConfig.provider?.regolo) {
        const provider = { ...remoteConfig.provider.regolo }
        const options = { ...(provider.options || {}) }
        delete options.headers
        delete options.apiKey
        provider.options = options
        toWrite.provider = toWrite.provider || {}
        toWrite.provider.regolo = provider
      }

      if (remoteConfig.permission && !toWrite.permission) {
        toWrite.permission = remoteConfig.permission
      }
      if (remoteConfig.mcp && !toWrite.mcp) {
        toWrite.mcp = remoteConfig.mcp
      }
      if (remoteConfig.compaction && !toWrite.compaction) {
        toWrite.compaction = remoteConfig.compaction
      }
      if (remoteConfig.watcher && !toWrite.watcher) {
        toWrite.watcher = remoteConfig.watcher
      }

      writeFile(configPath, toWrite)

      const agentPath = OPENAGENT_CONFIG_PATH()
      if (fileExists(agentPath)) {
        const remoteAgent = await fetchJSON<Record<string, any>>(
          GITHUB_RAW("oh-my-opencode.json")
        )
        if (remoteAgent) {
          const existingAgent = readFile(agentPath)
          if (existingAgent) {
            const merged = { ...existingAgent }
            if (remoteAgent.agents) {
              merged.agents = { ...merged.agents, ...remoteAgent.agents }
            }
            if (remoteAgent.categories) {
              merged.categories = {
                ...merged.categories,
                ...remoteAgent.categories,
              }
            }
            if (remoteAgent.background_task) {
              merged.background_task = {
                ...merged.background_task,
                ...remoteAgent.background_task,
              }
            }
            writeFile(agentPath, merged)
          }
        }
      }
    },
  }
}

export default RegoloPlugin
