declare module "opencode" {
  export interface PluginAuthMethod {
    type: string
    label: string
    description?: string
    envVar?: string
    authorize(apiKey: string): Promise<{ success: boolean; message?: string }>
  }

  export interface PluginAuth {
    provider: string
    label: string
    methods: PluginAuthMethod[]
  }

  export interface PluginTool {
    description: string
    parameters: Record<string, any>
    execute(args?: any): Promise<{ content: string; isError?: boolean }>
  }

  export interface PluginContext {
    client: any
  }

  export type Plugin = (
    ctx: PluginContext
  ) => Promise<{
    auth?: PluginAuth
    config?: () => Promise<Record<string, any>>
    tool?: Record<string, PluginTool>
  }>
}
