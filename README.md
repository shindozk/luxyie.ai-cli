<div align="center">
  <h1>Luxyie AI CLI</h1>
</div>

> **An intelligent, terminal-first AI assistant powered by NVIDIA Builds.**

<div align="center">
  <img src="https://i.imgur.com/02t4tnq.png" alt="Luxyie AI CLI"/>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/version-1.7.5-8B5CF6?style=for-the-badge)](https://github.com/shindozk/luxyie.ai-cli/releases)
[![Node](https://img.shields.io/badge/node-20%2B-10B981?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-6366F1?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-40%20passing-10B981?style=for-the-badge)](https://github.com/shindozk/luxyie.ai-cli/actions)

Luxyie CLI brings the power of advanced AI models directly into your terminal — whether you're coding, researching, writing, or automating tasks. Think of it as your personal AI pair programmer, researcher, and assistant — always ready, always fast.

</div>

---

<div align="center">

## ☕ Support the Project

**Love Luxyie AI CLI?** Your support keeps this project alive and growing!

This is a **100% free, open-source project** developed with countless hours of dedication. By supporting us on Ko-fi, you directly contribute to:

- 🚀 **New features** and AI model integrations
- 🐛 **Bug fixes** and performance improvements
- 📚 **Better documentation** and tutorials
- 💡 **Continuous innovation** in terminal AI tools

**Every contribution matters!** Even a small coffee helps keep the development going.

[![Ko-fi](https://img.shields.io/badge/Support%20on%20Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/shindozk)

**[👉 Click here to support the project on Ko-fi](https://ko-fi.com/shindozk)**

</div>

---

## 🚀 Installation

### Quick Install

```bash
npm install -g luxyie.ai-cli
```

After installation, the `luxyie` command is available globally:

```bash
luxyie chat
```

> 💡 **Auto-configuration**: The post-install script automatically sets up permissions. If the command isn't recognized, restart your terminal.

### Platform-Specific Setup

| Platform | Command |
|----------|---------|
| **Windows** | `$env:PATH = "$(npm config get prefix)\;$env:PATH"` |
| **macOS/Linux** | `source ~/.bashrc` or `source ~/.zshrc` |
| **Android (Termux)** | `pkg install nodejs-lts chromium && npm install -g luxyie.ai-cli` |

---

## ⚙️ Configuration

Luxyie CLI uses NVIDIA Builds public access API key out of the box — **no configuration needed**.

### Using Your Own API Key

```bash
# Linux/macOS
export NVIDIA_API_KEY="your-api-key-here"

# Windows (PowerShell)
$env:NVIDIA_API_KEY="your-api-key-here"
```

### Interactive Configuration

```bash
luxyie config set    # Edit settings interactively
luxyie config show   # View current configuration
luxyie config reset  # Reset to defaults
```

Configuration is stored in `~/.luxyie/config.json`.

---

## 📱 Android (Termux)

Luxyie AI CLI is **fully compatible** with Termux on Android.

### Quick Install

```bash
# 1. Install dependencies
pkg update && pkg upgrade
pkg install nodejs-lts chromium

# 2. Install Luxyie (auto-configures permissions)
npm install -g luxyie.ai-cli

# 3. Verify
luxyie --version
```

### Troubleshooting

**Permission errors?**
```bash
# Auto-fix
node /data/data/com.termux/files/usr/lib/node_modules/luxyie.ai-cli/scripts/fix-termux-permissions.cjs

# Or manual
npm install -g luxyie.ai-cli --ignore-scripts
chmod +x $(which luxyie)
```

**Web features not working?**
```bash
pkg install chromium
termux-setup-storage
```

### Termux Feature Support

| Feature | Status | Notes |
|---------|--------|-------|
| Chat & Ask | ✅ Full | No limitations |
| File operations | ✅ Full | Use `termux-setup-storage` |
| Command execution | ✅ Full | Termux-compatible commands |
| Web search/fetch | ⚠️ Requires Chromium | `pkg install chromium` |
| Image analysis | ✅ Full | Via Kimi-k2.5 |

See [docs/TERMUX-GUIDE.md](docs/TERMUX-GUIDE.md) for complete documentation.

---

## 🔧 Features

### ✨ Unlimited & Free
- **100% Free Forever**: No subscription, no credit card, no hidden costs
- **Unlimited Usage**: No daily limits, no restrictions, use as much as you need
- **No API Key Required**: Works out of the box with public NVIDIA Builds access
- **9 AI Models**: Access all supported models including Qwen 3.5, Mistral, Llama, Gemma, GLM, DeepSeek, GPT-OSS, and StepFun
- **Token Restoration**: Simply close and reopen the CLI to reset your token count — start fresh anytime!

> 💡 **Tip**: If you reach the token limit for a model, just close the CLI (`/quit`) and reopen it (`luxyie chat`) to restore all tokens. Your conversation history is saved automatically!

### 🤖 AI Agent Tools (8 Tools)

| Tool | Description |
|------|-------------|
| `write_file` | Create or update files |
| `run_command` | Execute shell commands |
| `read_file` | Read file contents |
| `list_directory` | Explore directory structure |
| `web_search` | Search via DuckDuckGo |
| `web_fetch` | Extract content from URLs |
| `web_viewer` | Browser automation |
| `read_image` | Analyze images (Kimi-k2.5) |

> 🔒 **Security First**: Every tool requires explicit user approval with "Allow once / Always allow / Deny" options.

### ✅ Core Capabilities
- 💬 **Natural Language Coding** — Write, debug, and explain code
- 🔍 **Web Search & Research** — Real-time results from DuckDuckGo
- 📄 **File Analysis** — Read and summarize any file type
- 🖼️ **Multimodal Input** — Analyze images via NVIDIA Vision API
- ⚡ **Terminal Automation** — Safe command execution
- 💾 **Persistent Context** — Save and resume conversations
- 🌐 **Multi-Language** — Auto-detects and responds in your language
- 🧠 **Reasoning Mode** — Extended thinking for complex problems
- 📊 **Token Usage Tracking** — Visual progress bars and warnings
- 🔧 **Git Integration** — Status, log, diff, and AI-assisted commits
- 🔄 **Auto-Update** — Checks for updates on startup and every 5 minutes

---

## 💬 Chat Commands

Inside a chat session, use these commands:

| Command | Description |
|---------|-------------|
| `/quit` `/exit` | Exit the chat session |
| `/clear` `/cls` | Clear conversation history |
| `/copy` `/cp` | Copy last AI response |
| `/help` `/?` | Show all available commands |
| `/model select` | Open interactive model selection menu |
| `/models` | List all available models with details |
| `/settings` `/cfg` | Show current settings |
| `/stats` `/usage` | Show session statistics with token usage |
| `/session <id>` | Switch to a saved session |
| `/share` | Export conversation as markdown |
| `/tools` | List available AI tools |
| `/reset` | Reset conversation with system prompt |
| `/about` | Show version and build info |
| `/theme` | Cycle through visual themes |
| `/init` | Analyze project and generate context file |
| `/git <sub>` | Git integration (status, log, diff, commit) |

### Model Commands

| Command | Description |
|---------|-------------|
| `/models` | **Lists all 9 models** with provider, temperature, max tokens, and reasoning support |
| `/model select` | Opens **interactive menu** to switch models |

**Example `/models` output:**
```
🤖 Available Models
──────────────────────────────────────────────────────────────────────

  ● qwen/qwen3.5-397b-a17b [thinking] [axios]
    temp: 0.6 | max_tokens: 16384 | top_p: 0.95

  ○ mistralai/mistral-small-4-119b-2603 [thinking] [axios]
    temp: 0.1 | max_tokens: 16384 | top_p: 1.0
  ...

Use /model select to switch models interactively
```

### Git Commands

| Command | Description |
|---------|-------------|
| `/git status` | Show current git status |
| `/git log [n]` | Show recent commits (default 10) |
| `/git diff` | Show unstaged changes |
| `/git branch` | List branches |
| `/git add [files]` | Stage files (default: all) |
| `/git commit <msg>` | Create commit with message |
| `/git ai-commit` | Generate AI commit message and commit |

---

## 🤖 Available Models

Luxyie supports **9 advanced AI models** via NVIDIA Builds:

| Model | Provider | Temp | Max Tokens | Reasoning |
|-------|----------|------|------------|-----------|
| `qwen/qwen3.5-397b-a17b` | axios | 0.6 | 16384 | ✅ |
| `mistralai/mistral-small-4-119b-2603` | axios | 0.1 | 16384 | ✅ |
| `meta/llama-3.3-70b-instruct` | openai | 0.2 | 1024 | ❌ |
| `google/gemma-4-31b-it` | axios | 1.0 | 16384 | ✅ |
| `z-ai/glm5` | openai | 1.0 | 16384 | ✅ |
| `qwen/qwen3-next-80b-a3b-instruct` | openai | 0.6 | 4096 | ❌ |
| `deepseek-ai/deepseek-v3.2` | openai | 1.0 | 8192 | ✅ |
| `openai/gpt-oss-120b` | openai | 1.0 | 4096 | ✅ |
| `stepfun-ai/step-3.5-flash` | openai | 1.0 | 16384 | ✅ |

> 💡 **Tip**: Models marked with ✅ support extended reasoning for complex problem-solving. Use `/models` to see full details including provider and parameters.

---

## 📊 Token Management

Luxyie CLI tracks token usage automatically and provides:

- **Visual progress bars** showing current usage vs. model limit
- **Warnings at 80% usage** so you can plan accordingly
- **Interactive options** when limit is reached:
  - 💾 Save session and restart
  - 🔄 Switch to another model
  - 🚪 Exit the CLI
- **Easy Token Restoration**: Close and reopen the CLI to reset your token count — your history is saved automatically!

**Example `/stats` output:**
```
📊 Session Statistics
──────────────────────────────────────────────────
  Duration: 5m 30s
  Tokens: ████████████████░░░░ 12,450 / 16,384 tokens (76%)
  Model: qwen/qwen3.5-397b-a17b
──────────────────────────────────────────────────
```

---

## 🛠️ CLI Commands

```bash
# Start interactive chat
luxyie chat                  # or: luxyie c

# Ask a quick question
luxyie ask "What is TypeScript?"

# Manage configuration
luxyie config show           # View settings
luxyie config set            # Edit interactively
luxyie config reset          # Reset to defaults

# Manage history
luxyie history list          # List all sessions
luxyie history show <id>     # View a session
luxyie history resume <id>   # Resume a session
luxyie history export <id>   # Export to JSON/MD/TXT
luxyie history delete <id>   # Delete a session
luxyie history clear         # Clear all sessions

# Check for updates
luxyie update check          # Check for updates
luxyie update install        # Install latest version
luxyie update status         # Show version info

# Help
luxyie --help                # Show help
luxyie --version             # Show version
```

---

## 💬 Quick Examples

### Start a chat
```bash
luxyie chat
> Explain quantum computing in simple terms
```

### Generate code
```bash
luxyie ask "Write a Node.js script that downloads a webpage"
```

### Analyze a file
```bash
luxyie ask "Summarize this file: ./src/core/agent.ts"
```

### Analyze an image
```bash
luxyie ask "Describe this image: ./screenshot.png"
```

### Git integration
```bash
luxyie chat
/git status
/git ai-commit
```

### Switch models
```bash
# List all models
/models

# Open interactive selection
/model select
```

---

## 🔒 Security

- 🔐 **Tool Approval**: Every tool execution requires user consent (Allow once / Always allow / Deny)
- 🛡️ **Sandboxed Commands**: Commands run in current directory only
- 🔍 **Symlink Protection**: Directory traversal is blocked
- ⚡ **Timeout Protection**: Operations have configurable timeouts
- 📝 **Audit Trail**: All tool executions are logged in history

---

## 📦 For Developers

### Build from Source

```bash
git clone https://github.com/shindozk/luxyie.ai-cli.git
cd luxyie.ai-cli
npm install
npm run build
npm link
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Watch mode for development |
| `npm start` | Run via `node dist/index.js` |
| `npm test` | Run test suite (Jest) |
| `npm run lint` | Check code quality (ESLint) |
| `npm run format` | Format code (Prettier) |
| `npm run build:bundle` | Create standalone bundle (esbuild) |

### Project Structure

```
src/
├── cli/                  # CLI setup (Commander.js)
├── commands/             # Command handlers
│   ├── chat.command.ts   # Main chat loop
│   ├── ask.command.ts    # Quick questions
│   ├── config.command.ts # Configuration management
│   ├── history.command.ts# Session management
│   ├── model.command.ts  # Model listing & selection
│   ├── token-limit.command.ts # Token management
│   └── ...
├── services/             # Business logic
│   ├── config.service.ts # Configuration manager
│   ├── llm.service.ts    # API client (OpenAI + Axios)
│   ├── history.service.ts# Session persistence
│   ├── update.service.ts # Auto-update checker
│   └── models.ts         # 9 available models
├── tools/                # Agent tools
│   └── executor.ts       # 8 tool implementations
├── ui/                   # Terminal UI
│   ├── components.ts     # Visual components
│   ├── renderer.ts       # Markdown rendering
│   └── terminal.ts       # Input handling
├── utils/                # Modular utilities
│   ├── git.ts            # Git operations
│   ├── paste-detector.ts # Paste detection
│   ├── session-manager.ts# Session lifecycle
│   ├── tool-executor.ts  # Tool execution flow
│   └── message-formatter.ts# Message formatting
├── prompts/              # System prompts
│   └── system-prompt.ts  # Agent identity & rules
└── types/                # TypeScript definitions
```

### Running Tests

```bash
npm test                   # Run all tests
npm test -- --coverage     # With coverage report
npm test -- --watch        # Watch mode
```

**Test Coverage**: 40 tests passing across 3 suites (UI helpers, validation, format).

---

## ⌨️ Shortcuts

| Shortcut | Action |
|----------|--------|
| **`Esc`** | Stop AI typing / abort tool execution |
| **`Ctrl + C`** | Gracefully exit the application |

---

## 🏗️ Architecture

```
User Input
    ↓
TerminalUI (readline + paste detection)
    ↓
ChatCommand / AskCommand
    ↓
APIClient (OpenAI SDK or Axios provider)
    ↓
NVIDIA Builds API
    ↓
StreamAccumulator (content + reasoning + tool calls)
    ↓
ToolExecutor (8 tools with approval)
    ↓
HistoryManager (session persistence)
    ↓
Renderer (Markdown → Terminal)
    ↓
User Output
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- TypeScript strict mode
- Prettier for formatting
- ESLint for linting
- Jest for testing

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- **[NVIDIA](https://build.nvidia.com)** — For the AI models and API
- **[Commander.js](https://github.com/tj/commander.js)** — CLI framework
- **[esbuild](https://esbuild.github.io)** — Blazing fast bundler
- **[Puppeteer](https://pptr.dev)** — Browser automation
- **[marked](https://marked.js.org)** — Markdown parser
- **[Inquirer](https://github.com/SBoudrias/Inquirer.js)** — Interactive prompts

---

<div align="center">
  <h3>Developed with ❤️ by ShindoZk</h3>
  <h3>Made in Brazil 🇧</h3>
  <p><strong>Version 1.7.5</strong> · <strong>40 Tests Passing</strong> · <strong>9 AI Models</strong> · <strong>100% Free Forever</strong></p>
</div>
