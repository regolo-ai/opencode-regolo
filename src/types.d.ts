declare module "@opencode-ai/plugin" {
  export interface PluginInput {
    client: any
    project: any
    directory: string
    worktree: string
    serverUrl: URL
    $: any
  }

  export interface ToolContext {
    sessionID: string
    messageID: string
    agent: string
    directory: string
    worktree: string
    abort: AbortSignal
    metadata(input: { title?: string; metadata?: Record<string, any> }): void
    ask(input: {
      permission: string
      patterns: string[]
      always: string[]
      metadata: Record<string, any>
    }): Promise<void>
  }

  export interface ToolDefinition {
    description: string
    args: any
    execute(args: any, context: ToolContext): Promise<string>
  }

  export interface Hooks {
    event?: (input: { event: any }) => Promise<void>
    config?: (input: any) => Promise<void>
    tool?: { [key: string]: ToolDefinition }
    auth?: AuthHook
    provider?: ProviderHook
    "chat.message"?: any
    "chat.params"?: any
    "chat.headers"?: any
    "permission.ask"?: any
    "tool.execute.before"?: any
    "tool.execute.after"?: any
    "tool.definition"?: any
    "shell.env"?: any
    "command.execute.before"?: any
    "experimental.chat.messages.transform"?: any
    "experimental.chat.system.transform"?: any
    "experimental.session.compacting"?: any
    "experimental.text.complete"?: any
  }

  export interface AuthHook {
    provider: string
    methods: AuthMethod[]
  }

  export type AuthMethod =
    | {
        type: "oauth"
        label: string
        prompts?: AuthPrompt[]
        authorize(inputs?: Record<string, string>): Promise<AuthOAuthResult>
      }
    | {
        type: "api"
        label: string
        prompts?: AuthPrompt[]
        authorize(
          inputs?: Record<string, string>
        ): Promise<
          | { type: "success"; key: string; provider?: string }
          | { type: "failed" }
        >
      }

  export type AuthPrompt =
    | {
        type: "text"
        key: string
        message: string
        placeholder?: string
        validate?: (value: string) => string | undefined
        condition?: (inputs: Record<string, string>) => boolean
        when?: { key: string; op: "eq" | "neq"; value: string }
      }
    | {
        type: "select"
        key: string
        message: string
        options: Array<{
          label: string
          value: string
          hint?: string
        }>
        condition?: (inputs: Record<string, string>) => boolean
        when?: { key: string; op: "eq" | "neq"; value: string }
      }

  export interface AuthOAuthResult {
    url: string
    instructions: string
    method: "auto" | "code"
    callback:
      | (() => Promise<
          | { type: "success"; provider?: string; key: string }
          | {
              type: "success"
              provider?: string
              refresh: string
              access: string
              expires: number
              accountId?: string
              enterpriseUrl?: string
            }
          | { type: "failed" }
        >)
      | ((
          code: string
        ) => Promise<
          | { type: "success"; provider?: string; key: string }
          | {
              type: "success"
              provider?: string
              refresh: string
              access: string
              expires: number
              accountId?: string
              enterpriseUrl?: string
            }
          | { type: "failed" }
        >)
  }

  export interface ProviderHook {
    id: string
    models?: (provider: any, ctx: { auth?: any }) => Promise<Record<string, any>>
  }

  export type Plugin = (
    input: PluginInput,
    options?: Record<string, unknown>
  ) => Promise<Hooks>

  export function tool<Args extends Record<string, any>>(input: {
    description: string
    args: Args
    execute(
      args: { [K in keyof Args]: any },
      context: ToolContext
    ): Promise<string>
  }): ToolDefinition

  export namespace tool {
    const schema: any
  }
}
