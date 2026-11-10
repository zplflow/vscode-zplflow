# zplflow for Visual Studio Code & VSCodium

<p align="center">
  <img src="https://raw.githubusercontent.com/zplflow/vscode-zplflow/main/icon.png" width="128" height="128" alt="zplflow logo" />
</p>

<p align="center">
  <strong>The complete developer tooling suite for Zebra Programming Language (ZPL).</strong><br>
  Built-in Language Server (LSP 3.17), exhaustive parameter documentation, real-time signature help, and pixel-perfect live preview with multi-DPI resolution switching.
</p>

---

## ✨ Features at a Glance

### ⚡ 1. Embedded Language Server (LSP 3.17)
No more searching through 1,200+ pages of PDF manuals! `zplflow` embeds a lightning-fast, native Go language server with complete documentation for **188 official Zebra commands**.
- **Intelligent Autocompletion**: Type `^` or `~` to browse available commands with inline summaries.
- **Detailed Parameter Breakdown**: Hover or inspect any command to see the full breakdown of all arguments, allowed values, expected formats, and default settings.
- **Interactive Signature Help**: As you type commas (e.g. `^FO100,50,0`), the active parameter is automatically highlighted in real time with its description and valid inputs.
- **Rich Hover Documentation**: Instant tooltips with command descriptions, parameter tables, and usage examples.
- **Zero External Dependencies**: Ships out of the box with cross-compiled native binaries for Linux (x64, arm64), macOS (Apple Silicon & Intel), and Windows (x64, arm64). No Go, Node, or Python installation required!

### 🖨️ 2. Pixel-Perfect Live Preview
- **Real-Time Label Rendering**: View your thermal labels rendered side-by-side with your code as you edit.
- **Printhead Resolution Switching**: Toggle between standard thermal printer resolutions:
  - **152 DPI** (6 dots/mm)
  - **203 DPI** (8 dots/mm) — industry standard for desktop & mobile
  - **300 DPI** (12 dots/mm) — high-density labels & 2D barcodes
  - **600 DPI** (24 dots/mm) — ultra-crisp micro-labels (PCB, pharma)
- **Custom Physical Dimensions**: Configure width and height in millimeters (defaults to standard 4" x 6" / 101.6mm x 152.4mm).
- **Instant Undo / Redo**: Features an in-memory SHA-256 LRU cache for lag-free navigation through your edit history.
- **Free Preview Tier**: Live previews use `POST /v1/pipelines/preview` with **0 token charges**.

### 🎨 3. Syntax Highlighting & Grammar
- Dedicated TextMate grammar for `.zpl`, `.prn`, and `.label` files.
- Accurate styling for control commands (`^XA`, `^XZ`), format commands (`^FO`, `^FD`, `^FS`), bar codes (`^BC`, `^BQ`, `^B3`), graphics (`^GF`, `^GB`), and comments (`^FX`).
- Comment toggling and block matching out of the box.

---

## 🚀 Quick Start

1. **Install the Extension** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zplflow.vscode-zplflow) or [Open VSX Registry](https://open-vsx.org/extension/zplflow/vscode-zplflow).
2. **Open any ZPL file** (`.zpl`, `.prn`, or `.label`). The language mode will automatically switch to `ZPL (Zebra Programming Language)` and start the embedded Language Server.
3. **Open the Live Preview**:
   - Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> on macOS).
   - Select **`zplflow: Open Live Preview`**.
4. **Code with Confidence**:
   - Type `^` to view suggestions.
   - Hover over commands like `^FO` or `^BC` to inspect parameter lists.
   - Fill in arguments and watch the signature guide you step by step.

---

## ⌨️ Commands

| Command | Title | Description |
|---|---|---|
| `zplflow.openPreview` | **zplflow: Open Live Preview** | Opens the live thermal label rendering preview panel side-by-side. |
| `zplflow.restartLsp` | **zplflow: Restart Language Server** | Restarts the background `zplflow-lsp` language server process. |

---

## ⚙️ Configuration Settings

Configure extension settings via VS Code Settings UI (`Ctrl+,` / `Cmd+,`) under **Extensions → zplflow**, or directly in your `.vscode/settings.json`:

| Setting | Type | Default | Description |
|---|---|---|---|
| `zplflow.lsp.enabled` | `boolean` | `true` | Enable or disable the background ZPL Language Server. |
| `zplflow.lsp.path` | `string` | `""` | Custom path to the `zplflow-lsp` binary. If empty, uses the bundled binary for your platform. |
| `zplflow.dpi` | `number` | `203` | Default printhead resolution in DPI (`152`, `203`, `300`, `600`). |
| `zplflow.widthMm` | `number` | `101.6` | Default label width in millimeters (`101.6` = 4 inches). |
| `zplflow.heightMm` | `number` | `152.4` | Default label height in millimeters (`152.4` = 6 inches). |
| `zplflow.renderMode` | `string` | `"onSave"` | When to refresh the preview: `"onSave"` (recommended) or `"onType"`. |
| `zplflow.debounceMs` | `number` | `450` | Debounce delay in milliseconds when `renderMode` is set to `"onType"`. |
| `zplflow.apiKey` | `string` | `""` | Optional API key for zplflow cloud services. |
| `zplflow.apiUrl` | `string` | `"https://api.zplflow.com"` | API URL for zplflow cloud or self-hosted on-premise gateway. |

---

## 🖥️ Supported Platforms

The embedded Language Server binary is precompiled and included for the following targets:

| Operating System | Architecture | Binary Name |
|---|---|---|
| **Linux** | x86_64 (amd64) | `bin/zplflow-lsp-linux-amd64` |
| **Linux** | ARM64 (aarch64) | `bin/zplflow-lsp-linux-arm64` |
| **macOS** | Apple Silicon (arm64) | `bin/zplflow-lsp-darwin-arm64` |
| **macOS** | Intel (amd64) | `bin/zplflow-lsp-darwin-amd64` |
| **Windows** | x86_64 (amd64) | `bin/zplflow-lsp-windows-amd64.exe` |
| **Windows** | ARM64 | `bin/zplflow-lsp-windows-arm64.exe` |

*Note: You can also specify an external binary path with `"zplflow.lsp.path"`.*

---

## 🔒 Privacy & Offline First

- **Language Server (LSP)**: Runs 100% locally on your machine via standard input/output (stdio). Your label code, templates, and barcodes are parsed entirely in memory and **never leave your local workstation** for autocompletion, hover documentation, or syntax inspection.
- **Preview**: Rendered via the zplflow engine. In-memory SHA-256 caching ensures minimal network traffic and zero duplicate rendering requests.

---

## 📚 Resources & Community

- 🌐 **Website**: [zplflow.com](https://zplflow.com)
- 📖 **Documentation**: [zplflow.com/docs](https://zplflow.com/docs)
- 🐛 **Issue Tracker**: [GitHub Issues](https://github.com/zplflow/vscode-zplflow/issues)
- 📦 **Source Code**: [github.com/zplflow/vscode-zplflow](https://github.com/zplflow/vscode-zplflow)

---

## 📄 License

This extension is licensed under the [MIT License](LICENSE.md).
