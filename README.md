# zplflow for Visual Studio Code

Official Visual Studio Code extension for **zplflow** — pixel-perfect ZPL thermal label live preview, syntax highlighting, and resolution switching (152 / 203 / 300 / 600 DPI).

## Features

- **ZPL Syntax Highlighting** for `.zpl`, `.prn`, and `.label` files.
- **Pixel-Perfect Live Preview** via `POST /v1/pipelines/preview` (0 token charge).
- **Dynamic Printhead Resolution** switcher (`152`, `203`, `300`, `600` DPI) and custom label dimensions in millimeters.
- **In-Memory SHA-256 LRU Cache** for zero-latency Undo/Redo previews and rate-limit awareness.
