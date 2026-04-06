# Luxyie AI CLI

> **An intelligent, terminal-first AI assistant powered by NVIDIA and OpenAI.**

Luxyie CLI brings the power of advanced AI models directly into your terminal — whether you're coding, researching, writing, or automating tasks. Think of it as your personal AI pair programmer, researcher, and assistant — always ready, always fast.

<div align="center">
  <img src="https://i.imgur.com/02t4tnq.png" alt="Luxyie AI CLI"/>
</div>

---

## 🚀 Installation

Install globally with npm:

```bash
npm install -g luxyie.ai-cli
```

After installation, Luxyie CLI automatically configures your system to make the `luxyie` command available globally in your terminal. This includes:

- **Windows**: Adds the npm global bin directory (`%APPDATA%\npm`) to your system PATH via the Windows Registry.
- **macOS/Linux**: Adds the path to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`) if not already present.

> 💡 **No manual setup required.** The post-install script handles everything automatically.

Once installed, run:

```bash
luxyie
```

> If the command is not recognized after installation, restart your terminal or run:
> - **Windows**: `$env:PATH = "$(npm config get prefix)\;$env:PATH"`
> - **macOS/Linux**: `source ~/.bashrc` or `source ~/.zshrc`

---

## 🔧 Features

### ✨ Unlimited & Free
- **🆓 100% Free** — No subscription required
- **🚀 Unlimited Usage** — No token limits, use as much as you need
- **🔑 No API Key Required** — Works out of the box with pre-configured access
- **♾️ Unlimited Models** — Access all supported AI models without restrictions

### ✅ Core Capabilities
- **Natural Language Coding**: Write, explain, and debug code with AI.
- **Web Search & Research**: Fetch real-time results from Google and academic sources.
- **File Analysis**: Read, summarize, and extract insights from PDFs, codebases, and documents.
- **Multimodal Input**: Analyze screenshots and images via `luxyie image` (requires GPU).
- **Terminal Automation**: Execute shell commands safely with context-aware validation.
- **Persistent Context**: Save conversations and resume them later with `luxyie checkpoint`.

### 🛠️ Built-in Tools

| Tool | Description |
|------|-------------|
| `/chat` | Start a conversational AI session |
| `/code` | Generate or refactor code |
| `/search` | Google-powered web search |
| `/read` | Analyze local files (PDF, TXT, JS, etc.) |
| `/image` | Analyze screenshots or images |
| `/shell` | Execute safe shell commands |
| `/config` | View or edit your settings |

---

## 💬 Quick Examples

### Start a chat
```bash
luxyie > Explain quantum computing in simple terms
```

### Generate code from a prompt
```bash
luxyie > Write a Node.js script that downloads a webpage and saves it as HTML
```

### Analyze a file
```bash
luxyie > Summarize this file: ./src/core/agent.ts
```

### Take a screenshot and ask about it
```bash
luxyie image screenshot.png > What does this UI show?
```

### Run a shell command safely
```bash
luxyie > List all files in /home and show only .js files
```

---

## 📁 Configuration

Luxyie stores settings in `~/.luxyie/`:

```bash
~/.luxyie/
├── config.json # API keys, model preferences
├── history.json # Conversation history
├── checkpoints/ # Saved sessions
└── cache/ # Cached web results and images
```

To edit config:
```bash
luxyie config
```

---

## 🛡️ Security
- **No data is sent to third parties** unless you provide an API key.
- All shell commands are **sandboxed** and require explicit confirmation.
- Images and files are processed **locally** when possible.
- You can disable telemetry in `config.json`.

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

Then run `luxyie` from anywhere.

### Contributing
We welcome contributions! Check out our [Contributing Guide](CONTRIBUTING.md).

---

## ☕ Support
If you like this project, consider supporting via [Ko-fi](https://ko-fi.com/shindozk).

---

## 📜 License
MIT © [ShindoZk](https://github.com/shindozk)

---
> 💡 **Pro Tip**: Press `Ctrl + C` twice to exit gracefully. Use `/help` anytime for a list of commands.