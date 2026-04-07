# opencode-regolo

An [OpenCode](https://opencode.ai) plugin that adds [Regolo AI](https://regolo.ai) as an LLM provider — EU-hosted, zero data retention, 100% green energy.

It automatically downloads the latest provider configuration and model definitions from [regolo-ai/opencode-configs](https://github.com/regolo-ai/opencode-configs), handles API key authorization, and optionally configures [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) to use Regolo models.

## Features

- **Automatic provider setup** — downloads model definitions from the official regolo-ai/opencode-configs repository
- **API key authorization** — guides the user through getting and validating a Regolo API key
- **Model registration** — adds all available Regolo models to OpenCode's provider config
- **oh-my-openagent integration** — detects if oh-my-openagent is installed and suggests the companion config for agent/category model assignments
- **Live model listing** — query the Regolo API directly to see currently available models

## Models

The plugin registers these models (fetched dynamically from the configs repo):

| Model ID | Context | Best For |
|----------|---------|----------|
| `qwen3.5-122b` | 120K | Main reasoning, multimodal (text + image) |
| `qwen3-coder-next` | 240K | Fast coding, tool use |
| `mistral-small-4-119b` | 120K | Balanced reasoning, multimodal (text + image)  |
| `minimax-m2.5` | 130K | Large context tasks |
| `gpt-oss-120b` | 120K | Alternative reasoning |

Models are referenced as `regolo/<model-id>` in OpenCode (e.g., `regolo/qwen3-coder-next`).

## Setup

### 1. Get a Regolo API Key

1. Sign up at [dashboard.regolo.ai](https://dashboard.regolo.ai)
2. Navigate to **Virtual Keys**
3. Create a new key (select "All models" for full access)
4. Copy the key

### 2. Authorize via OpenCode

Once the plugin is loaded, OpenCode will prompt you to connect the Regolo provider, or you can run:

```
/connect regolo
```

Enter your API key when prompted. OpenCode stores it securely in its built-in vault (`~/.local/share/opencode/auth.json`) — no environment variables needed.

### 3. Install the Plugin

**Option A: From npm** (if published)

Add to your `opencode.json`:

```jsonc
{
  "plugin": ["opencode-regolo@latest"]
}
```

**Option B: Local development**

1. Clone this repository:
   ```bash
   git clone https://github.com/user/opencode-regolo.git
   cd opencode-regolo
   ```

2. Copy or symlink into your OpenCode plugins directory:
   ```bash
   ln -s $(pwd) ~/.config/opencode/plugins/opencode-regolo
   ```

3. Reference in `opencode.json`:
   ```jsonc
   {
     "plugin": ["./plugins/opencode-regolo"]
   }
   ```

### 4. First-Time Setup

Once the plugin is loaded, OpenCode will prompt you to connect the Regolo provider, or you can run `/connect` and search for `Regolo`. Enter your API key name and key — it's stored securely in OpenCode's built-in auth vault.

## Usage

### List Available Models

Use the built-in tool to query live models from Regolo:

```
> /tool regolo-models
```

### Download Latest Configs

Run the setup tool to fetch the latest configuration files from the regolo-ai/opencode-configs repo:

```
> /tool regolo-setup
```

This downloads:
- `opencode.json` — provider config with all model definitions, MCP servers, permissions
- `oh-my-opencode.json` — agent and category model assignments (for oh-my-openagent users)

### Set Default Model

In your `opencode.json`:

```jsonc
{
  "model": "regolo/qwen3.5-122b",
  "small_model": "regolo/qwen3-coder-next"
}
```

## oh-my-openagent Integration

If you use [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) (formerly oh-my-opencode), this plugin provides a companion config that assigns Regolo models to each specialized agent:

| Agent | Model | Role |
|-------|-------|------|
| sisyphus | minimax-m2.5 | Main orchestrator |
| oracle | qwen3.5-122b | Read-only consultation |
| librarian | qwen3.5-122b | External documentation search |
| explore | qwen3-coder-next | Codebase exploration |
| prometheus | minimax-m2.5 | Planning |
| metis | mistral-small-4-119b | Pre-planning analysis |
| momus | qwen3-coder-next | Quality review |
| hephaestus | minimax-m2.5 | Code generation |
| atlas | qwen3.5-122b | Knowledge management |
| multimodal-looker | mistral-small-4-119b | Visual analysis |

### Applying the openagent Config

If `oh-my-openagent.json` exists in your OpenCode config directory (`~/.config/opencode/`), running `/tool regolo-setup` will **automatically merge** the Regolo model assignments into it — overwriting the `agents`, `categories`, and `background_task` sections with Regolo models while preserving any other settings you have.

If oh-my-openagent is not detected, the setup tool will print a reminder to install it first.

To manually apply the config:

```bash
curl -o ~/.config/opencode/oh-my-openagent.json \
  https://raw.githubusercontent.com/regolo-ai/opencode-configs/main/oh-my-opencode.json
```

## Configuration Reference

The plugin adds a `regolo` provider to OpenCode using the `@ai-sdk/openai-compatible` package:

```jsonc
{
  "provider": {
    "regolo": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Regolo",
      "options": {
        "baseURL": "https://api.regolo.ai/v1",
        "timeout": 1200000,
        "apiKey": "{auth:regolo}"
      },
      "models": {
        "qwen3.5-122b": { ... },
        "qwen3-coder-next": { ... },
        // etc.
      }
    }
  }
}
```

## Requirements

- [OpenCode](https://opencode.ai) >= 0.14.0
- A [Regolo AI](https://regolo.ai) account with an API key
