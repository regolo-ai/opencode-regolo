import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

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
  } catch {}
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

function writeOpenAgentConfig(
  path: string,
  config: Record<string, any>
): boolean {
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

export const RegoloPlugin: Plugin = async (ctx) => {
  return {
    auth: {
      provider: "regolo",
      loader: async (getAuth, provider) => {
        const auth = await getAuth()
        if (!auth || auth.type !== "api") {
          throw new Error(
            "No API key found. Run '/connect' and pick 'Regolo' to set up your Regolo AI connection."
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
      const remoteConfig = await downloadOpenCodeConfig()
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
    },

    tool: {
      "regolo-setup": tool({
        description:
          "Download and apply Regolo AI configuration. Fetches opencode.json from regolo-ai/opencode-configs and merges oh-my-openagent config if detected.",
        args: {
          includeOpenAgent: tool.schema
            .boolean()
            .describe(
              "Also merge the oh-my-openagent config (default: true)"
            )
            .default(true),
        },
        async execute(args) {
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
            "ℹ API key is managed by OpenCode vault — use /connect to set it up"
          )

          if (includeOpenAgent) {
            const agentConfig = await downloadOpenAgentConfig()
            if (agentConfig) {
              const openAgentPath = detectOpenAgentConfig()
              if (openAgentPath) {
                const existing = readOpenAgentConfig(openAgentPath)
                if (existing) {
                  const merged = { ...existing }
                  if (agentConfig.agents)
                    merged.agents = {
                      ...merged.agents,
                      ...agentConfig.agents,
                    }
                  if (agentConfig.categories)
                    merged.categories = {
                      ...merged.categories,
                      ...agentConfig.categories,
                    }
                  if (agentConfig.background_task)
                    merged.background_task = {
                      ...merged.background_task,
                      ...agentConfig.background_task,
                    }

                  const written = writeOpenAgentConfig(openAgentPath, merged)
                  if (written) {
                    const agents = Object.keys(agentConfig.agents || {})
                    const categories = Object.keys(
                      agentConfig.categories || {}
                    )
                    results.push(`✓ Updated ${openAgentPath}`)
                    results.push(
                      `  Merged ${agents.length} agent models: ${agents.join(", ")}`
                    )
                    results.push(
                      `  Merged ${categories.length} category models: ${categories.join(", ")}`
                    )
                  } else {
                    results.push(
                      `✗ Failed to write ${openAgentPath} — permission denied?`
                    )
                  }
                } else {
                  results.push(`✗ Failed to read existing ${openAgentPath}`)
                }
              } else {
                results.push(
                  "ℹ oh-my-openagent not detected. Install it, then re-run regolo-setup"
                )
                results.push(
                  "  Or manually copy: https://github.com/regolo-ai/opencode-configs/blob/main/oh-my-opencode.json"
                )
              }
            } else {
              results.push("✗ Failed to download oh-my-opencode.json")
            }
          }

          return results.join("\n")
        },
      }),

      "regolo-models": tool({
        description:
          "List all available models on Regolo AI by querying the live API.",
        args: {},
        async execute() {
          try {
            const res = await fetch(`${REGOLO_API_BASE}/models`, {
              headers: { Accept: "application/json" },
            })
            if (!res.ok) {
              return `Error: ${res.status} ${res.statusText}`
            }
            const data = (await res.json()) as {
              data: Array<{ id: string }>
            }
            const models = data.data.map((m) => m.id).sort()
            return `Available Regolo AI models (${models.length}):\n${models.map((m) => `  • ${m}`).join("\n")}`
          } catch (err: any) {
            return `Error fetching models: ${err.message}`
          }
        },
      }),
    },
  }
}

export default RegoloPlugin
