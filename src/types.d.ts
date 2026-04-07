declare module "@opencode-ai/plugin" {
  export interface PluginInput {
    client: any
    project: any
    directory: string
    worktree: string
    serverUrl: URL
    $: any
  }

  export interface AuthHook {
    provider: string
    loader?: (
      getAuth: () => Promise<any>,
      provider?: any
    ) => Promise<Record<string, any>>
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

  export interface Hooks {
    config?: (input: any) => Promise<void>
    auth?: AuthHook
  }

  export type Plugin = (
    input: PluginInput,
    options?: Record<string, unknown>
  ) => Promise<Hooks>
}
