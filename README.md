<div align="center">
  <img src="https://i.imgur.com/02t4tnq.png" alt="Luxyie AI CLI Logo"/>
  <h1>Luxyie AI CLI</h1>
</div>

An intelligent, robust, and cross-platform CLI for interacting with advanced AI models (powered by NVIDIA Builds). Inspired by Gemini CLI, but with more tools, session management, and multiplatform support (Linux, macOS, Windows, Android/Termux).

---
**Unlimited:**
- No API key required (works out of the box)
- No token or usage limits
- Unlimited usage for all users

---

## 🚀 Installation

### Global Installation (Recommended)

Install via npm to use `luxyie` command from any directory:

```bash
# Install globally
npm install -g luxyie.ai-cli

# Now you can run from any directory:
luxyie
luxyie chat
luxyie ask "Hello AI"
```

### Using npx (No Installation)

Run without installing:

```bash
npx luxyie.ai-cli
```

### Development / Local Installation

For development or testing locally:

```bash
# Clone the repository
git clone https://github.com/shindozk/luxyie.ai-cli.git
cd luxyie.ai-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link for global use (creates symlink)
npm link

# Now luxyie command is available globally
luxyie --version

# To unlink when done:
npm unlink -g luxyie.ai-cli
```

**Requirements:**  
- Node.js >= 22 (Linux, macOS, Windows, Android/Termux)
- For clipboard support:  
  - Linux: `xclip` or `xsel`  
  - macOS: `pbcopy`  
  - Android/Termux: `pkg install xclip`  
- For image display: Terminal must support iTerm2/Kitty/compatible (optional)

---

## 💬 Usage

### Start Interactive Chat

```bash
luxyie
# or
luxyie chat
```

- `--session <id>`: Resume a previous session
- `--no-history`: Disable history for this session

### Quick Question

```bash
luxyie ask "What is the capital of France?"
```

### Manage Settings

```bash
luxyie config show      # View current config
luxyie config set       # Update config interactively
luxyie config reset     # Reset config to defaults
```

### Conversation History

```bash
luxyie history list           # List all sessions
luxyie history show <id>      # Show a session
luxyie history delete <id>    # Delete a session
luxyie history clear          # Delete all sessions
```

---

## 🛠️ Chat Commands (in chat mode)

- `/quit` or `/exit` — Exit chat
- `/clear` — Clear current session history
- `/copy` — Copy last AI response to clipboard
- `/history` — Show current session ID
- `/help` — Show all commands
- `/model list` — List available models
- `/model select <id>` — Change model

---

## ⚙️ Configuration

Config is stored at `~/.luxyie/config.json`:

```json
{
  "model": "qwen/qwen3-next-80b-a3b-instruct",
  "maxTokens": 4096,
  "temperature": 0.6,
  "topP": 0.95,
  "enableThinking": true,
  "systemPrompt": "...",
  "historyEnabled": true,
  "streamEnabled": true
}
```

---

## 🧑‍💻 Advanced Usage

### Run Shell Commands

```bash
luxyie chat
# In chat: /tool run_command { "command": "npm run build && npm test" }
```

### List Files Recursively

```bash
luxyie chat
# In chat: /tool list_directory { "path": ".", "maxDepth": 2 }
```

### Create and Read Files

```bash
luxyie chat
# In chat: /tool write_file { "path": "src/test.txt", "content": "hello world" }
# In chat: /tool read_file { "path": "src/test.txt" }
```

---

## 🖥️ Platform Support

- **Linux:** Full support (clipboard, images, shell, etc.)
- **macOS:** Full support (clipboard, images, shell, etc.)
- **Windows:** Full support (PowerShell fallback for shell commands)
- **Android (Termux):** Supported, but clipboard and image display may require extra packages.

**Clipboard not working?**  
- Linux: `sudo apt install xclip` or `xsel`
- macOS: Should work out of the box
- Android/Termux: `pkg install xclip`

**Image display not working?**  
- Only supported in iTerm2, Kitty, or compatible terminals. Otherwise, a warning will be shown.

---

## 🛡️ Troubleshooting

### Command not found after global install

If `luxyie` command is not found after `npm install -g`:

**Check npm global bin directory:**
```bash
npm config get prefix
```

**Add to PATH (if needed):**
- **Linux/macOS:** Add to `~/.bashrc`, `~/.zshrc`, or `~/.profile`:
  ```bash
  export PATH="$PATH:$(npm config get prefix)/bin"
  ```
- **Windows:** Add `%APPDATA%\npm` to your system PATH environment variable

**Verify installation:**
```bash
npm list -g luxyie.ai-cli
which luxyie    # Linux/macOS
where luxyie    # Windows
```

### Other issues

- If the terminal freezes after pressing Esc, use Ctrl+C to force exit.
- If a command hangs, press Esc to interrupt.
- Use `maxDepth` and `timeoutMs` in `list_directory` to avoid infinite loops.
- All errors and tool logs are shown in the terminal for transparency.

---

## ☕ Support

If you like this project, consider supporting via [Ko-fi](https://ko-fi.com/shindozk).

---

## 📄 License

© MIT

<div align="center">
<h4>Developed by ShindoZK</h4>
<h3>Made with ❤️ in Brazil</h3>
</div>