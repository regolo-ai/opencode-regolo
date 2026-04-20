# opencode-regolo

An [OpenCode](https://opencode.ai) plugin that adds [Regolo AI](https://regolo.ai) as an LLM provider — EU-hosted, zero data retention, 100% green energy.

It automatically downloads the latest provider configuration and model definitions from [regolo-ai/opencode-configs](https://github.com/regolo-ai/opencode-configs), handles API key authorization, and optionally configures [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) to use Regolo models.

## ⚠️ One-Time Setup Plugin

This plugin is **needed only for initial setup**. Once the provider configuration is saved to your local files:

1. The plugin can be removed from `opencode.json`
2. Regolo will continue to work because the config lives in `~/.config/opencode/opencode.json`

## Features

- **First-run setup** — downloads model definitions from the official repo, writes to local config
- **API key authorization** — guides the user through getting and validating a Regolo API key
- **Model registration** — adds all available Regolo models to OpenCode's provider config
- **oh-my-openagent integration** — detects if oh-my-openagent is installed and merges the companion config for agent/category model assignments
- **One-time download** — after first setup, the plugin **removes itself** from opencode.json (zero network on subsequent runs)

## Models

The plugin registers these models:

| Model ID | Context | Best For |
|----------|---------|----------|
| `qwen3.5-122b` | 120K | Main reasoning, multimodal (text + image) |
| `qwen3-coder-next` | 240K | Fast coding, tool use |
| `mistral-small-4-119b` | 120K | Balanced reasoning, multimodal (text + image) |
| `minimax-m2.5` | 130K | Large context tasks |
| `gpt-oss-120b` | 120K | Alternative reasoning |

Models are referenced as `regolo/<model-id>` in OpenCode (e.g., `regolo/qwen3-coder-next`).

## Setup

### 1. Get a Regolo API Key

1. Sign up at [dashboard.regolo.ai](https://dashboard.regolo.ai)
2. Navigate to **Virtual Keys**
3. Create a new key (select "All models" for full access)
4. Copy the key

### 2. Install the Plugin

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
   git clone https://github.com/regolo-ai/opencode-regolo.git
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

### 3. First Run (One-Time)

1. Restart OpenCode — the plugin:
   - Downloads the config and writes it to `~/.config/opencode/opencode.json`
   - Merges oh-my-openagent config if present
   - **Automatically removes itself from opencode.json**
2. Run `/connect regolo` and enter your API key when prompted
3. OpenCode stores it securely in its built-in vault — no environment variables needed

That\'s it! The Regolo provider is now saved in your local config and works without the plugin.

### 5. Set Default Model

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

On first run, if `oh-my-openagent.json` exists in your OpenCode config directory (`~/.config/opencode/`), the plugin **automatically merges** the Regolo model assignments into it — overwriting `agents`, `categories`, and `background_task` while preserving any other settings you have.

## Requirements

- [OpenCode](https://opencode.ai)
- A [Regolo AI](https://regolo.ai) account with an API key