import type { Plugin } from "opencode"

const REGOLO_CONFIGS_REPO = "regolo-ai/opencode-configs"
const REGOLO_CONFIGS_BRANCH = "main"
const REGOLO_API_BASE = "https://api.regolo.ai/v1"
const OPENCODE_GLOBAL_DIR = () =>
  process.env.XDG_CONFIG_HOME
    ? `${process.env.XDG_CONFIG_HOME}/opencode`
    : `${process.env.HOME}/.config/opencode`

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

function detectOpenAgentConfig(): string | null {
  const dir = OPENCODE_GLOBAL_DIR()
  const configPath = `${dir}/oh-my-openagent.json`
  try {
    const fs = require("fs")
    if (fs.existsSync(configPath)) return configPath
  } catch {
  }
  return null
}

function readOpenAgentConfig(path: string): Record<string, any> | null {
  try {
    const fs = require("fs")
    const content = fs.readFileSync(path, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

function writeOpenAgentConfig(path: string, config: Record<string, any>): boolean {
  try {
    const fs = require("fs")
    fs.writeFileSync(path, JSON.stringify(config, null, 2) + "\n")
    return true
  } catch {
    return false
  }
}

async function downloadOpenCodeConfig(): Promise<Record<string, any> | null> {
  return fetchJSON<Record<string, any>>(GITHUB_RAW("opencode.json"))
}

async function downloadOpenAgentConfig(): Promise<Record<string, any> | null> {
  return fetchJSON<Record<string, any>>(
    GITHUB_RAW("oh-my-opencode.json")
  )
}

function sanitizeProviderConfig(config: Record<string, any>): Record<string, any> {
  const provider = { ...config }
  const options = { ...provider.options }

  delete options.headers

  options.apiKey = "{auth:regolo}"

  provider.options = options
  return provider
}

export const RegoloPlugin: Plugin = async (ctx) => {
  return {
    auth: {
      provider: "regolo",
      label: "Regolo AI",
      methods: [
        {
          type: "api-key" as any,
          label: "Regolo AI API Key",
          description:
            "Get your API key from https://dashboard.regolo.ai — navigate to Virtual Keys and create a new key.",
          async authorize(apiKey: string) {
            try {
              const res = await fetch(`${REGOLO_API_BASE}/models`, {
                headers: { Authorization: `Bearer ${apiKey}` },
              })
              if (!res.ok) {
                return {
                  success: false,
                  message: `API key validation failed: ${res.status} ${res.statusText}`,
                }
              }
              return { success: true }
            } catch (err: any) {
              return {
                success: false,
                message: `Connection error: ${err.message}`,
              }
            }
          },
        },
      ],
    },

    config: async () => {
      const remoteConfig = await downloadOpenCodeConfig()
      if (!remoteConfig) {
        console.warn(
          "[opencode-regolo] Failed to download config from regolo-ai/opencode-configs"
        )
        return {}
      }

      const result: Record<string, any> = {}

      if (remoteConfig.provider?.regolo) {
        result.provider = {
          regolo: sanitizeProviderConfig(remoteConfig.provider.regolo),
        }
      }

      if (remoteConfig.permission) {
        result.permission = remoteConfig.permission
      }

      if (remoteConfig.mcp) {
        result.mcp = remoteConfig.mcp
      }

      if (remoteConfig.compaction) {
        result.compaction = remoteConfig.compaction
      }

      if (remoteConfig.watcher) {
        result.watcher = remoteConfig.watcher
      }

      return result
    },

    tool: {
      "regolo-setup": {
        description:
          "Download and apply Regolo AI configuration files. Fetches the latest opencode.json from regolo-ai/opencode-configs and optionally the oh-my-openagent config.",
        parameters: {
          type: "object",
          properties: {
            includeOpenAgent: {
              type: "boolean",
              description:
                "Also download and apply the oh-my-openagent config (default: true)",
              default: true,
            },
          },
        },
        async execute(args: { includeOpenAgent?: boolean }) {
          const includeOpenAgent = args.includeOpenAgent !== false
          const results: string[] = []

          const remoteConfig = await downloadOpenCodeConfig()
          if (remoteConfig?.provider?.regolo) {
            const models = Object.keys(
              remoteConfig.provider.regolo.models || {}
            )
            results.push(
              `✓ Downloaded opencode.json with ${models.length} models: ${models.join(", ")}`
            )
          } else {
            results.push(
              "✗ Failed to download opencode.json from regolo-ai/opencode-configs"
            )
          }

          results.push(
            "ℹ API key is managed by OpenCode's vault — use /connect to set it up"
          )

          if (includeOpenAgent) {
            const agentConfig = await downloadOpenAgentConfig()
            if (agentConfig) {
              const openAgentPath = detectOpenAgentConfig()
              if (openAgentPath) {
                const existing = readOpenAgentConfig(openAgentPath)
                if (existing) {
                  const merged = { ...existing }
                  if (agentConfig.agents) merged.agents = { ...merged.agents, ...agentConfig.agents }
                  if (agentConfig.categories) merged.categories = { ...merged.categories, ...agentConfig.categories }
                  if (agentConfig.background_task) merged.background_task = { ...merged.background_task, ...agentConfig.background_task }

                  const written = writeOpenAgentConfig(openAgentPath, merged)
                  if (written) {
                    const agents = Object.keys(agentConfig.agents || {})
                    const categories = Object.keys(agentConfig.categories || {})
                    results.push(`✓ Updated ${openAgentPath}`)
                    results.push(`  Merged ${agents.length} agent models: ${agents.join(", ")}`)
                    results.push(`  Merged ${categories.length} category models: ${categories.join(", ")}`)
                  } else {
                    results.push(`✗ Failed to write ${openAgentPath} — permission denied?`)
                  }
                } else {
                  results.push(`✗ Failed to read existing ${openAgentPath}`)
                }
              } else {
                results.push(`ℹ oh-my-openagent not detected. To use Regolo models with it:`)
                results.push(`  Install oh-my-openagent, then re-run /tool regolo-setup`)
                results.push(`  Or manually copy: https://github.com/regolo-ai/opencode-configs/blob/main/oh-my-opencode.json`)
              }
            } else {
              results.push("✗ Failed to download oh-my-opencode.json")
            }
          }

          return {
            content: results.join("\n"),
          }
        },
      },

      "regolo-models": {
        description:
          "List all available models on Regolo AI by querying the live API endpoint.",
        parameters: {
          type: "object",
          properties: {},
        },
        async execute() {
          try {
            const res = await fetch(`${REGOLO_API_BASE}/models`, {
              headers: { Accept: "application/json" },
            })
            if (!res.ok) {
              return {
                content: `Error: ${res.status} ${res.statusText}`,
                isError: true,
              }
            }
            const data = (await res.json()) as {
              data: Array<{ id: string; object: string; owned_by: string }>
            }
            const models = data.data.map((m) => m.id).sort()
            return {
              content: `Available Regolo AI models (${models.length}):\n${models.map((m) => `  • ${m}`).join("\n")}`,
            }
          } catch (err: any) {
            return {
              content: `Error fetching models: ${err.message}`,
              isError: true,
            }
          }
        },
      },
    },
  }
}

export default RegoloPlugin
