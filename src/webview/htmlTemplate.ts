import type { SupportedDPI } from '../client/zplflowClient';

export interface PreviewViewState {
  pngBase64?: string;
  dpi: SupportedDPI;
  widthMm: number;
  heightMm: number;
  currentPage: number;
  pageCount: number;
  fromCache?: boolean;
  rateLimitRemaining?: number;
  loading?: boolean;
  errorMessage?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPreviewHtml(state: PreviewViewState): string {
  const dpiOptions: SupportedDPI[] = [152, 203, 300, 600];
  const dpiSelectHtml = dpiOptions
    .map(
      (d) =>
        `<option value="${d}" ${state.dpi === d ? 'selected' : ''}>${d} DPI</option>`
    )
    .join('');

  const badgeHtml = state.fromCache
    ? `<span class="badge cached">Cached (0ms)</span>`
    : state.rateLimitRemaining !== undefined
      ? `<span class="badge quota">Quota: ${state.rateLimitRemaining}/min</span>`
      : '';

  const errorBannerHtml = state.errorMessage
    ? `<div class="error-banner">${escapeHtml(state.errorMessage)}</div>`
    : '';

  const canvasContentHtml = state.loading
    ? `<div class="status-msg">Rendering pixel-perfect ZPL via zplflow...</div>`
    : state.pngBase64
      ? `<img id="label-img" src="data:image/png;base64,${state.pngBase64}" alt="ZPL Label Preview" />`
      : `<div class="status-msg">Open a .zpl file and save to preview.</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>zplflow Live Preview</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #1e1e1e;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
      flex-wrap: wrap;
    }
    .toolbar select, .toolbar input, .toolbar button {
      background: #3c3c3c;
      color: #f0f0f0;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
    }
    .toolbar button:hover {
      background: #0e639c;
      cursor: pointer;
    }
    .badge {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: auto;
    }
    .badge.cached {
      background: #1b4721;
      color: #7ee787;
    }
    .badge.quota {
      background: #2d333b;
      color: #adbac7;
    }
    .error-banner {
      background: #5a1d1d;
      color: #f48771;
      padding: 8px 12px;
      font-size: 12px;
      border-bottom: 1px solid #be1100;
    }
    .viewport {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background-image: radial-gradient(#333 1px, transparent 1px);
      background-size: 16px 16px;
    }
    #label-img {
      max-width: 100%;
      height: auto;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      border-radius: 2px;
      transform-origin: center center;
      transition: transform 0.12s ease;
    }
    .status-msg {
      color: #888;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <label>DPI:
      <select id="dpi-select">${dpiSelectHtml}</select>
    </label>
    <label>W (mm):
      <input id="width-input" type="number" step="0.1" value="${state.widthMm}" style="width: 64px;" />
    </label>
    <label>H (mm):
      <input id="height-input" type="number" step="0.1" value="${state.heightMm}" style="width: 64px;" />
    </label>
    <button id="refresh-btn" type="button">Refresh</button>
    <span class="page-indicator">Page ${state.currentPage + 1} / ${Math.max(1, state.pageCount)}</span>
    <button id="prev-page-btn" type="button" ${state.currentPage <= 0 ? 'disabled' : ''}>◀</button>
    <button id="next-page-btn" type="button" ${state.currentPage + 1 >= state.pageCount ? 'disabled' : ''}>▶</button>
    ${badgeHtml}
  </div>
  ${errorBannerHtml}
  <div class="viewport">
    ${canvasContentHtml}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('dpi-select')?.addEventListener('change', (e) => {
      vscode.postMessage({ type: 'changeDpi', dpi: Number(e.target.value) });
    });
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      const widthMm = Number(document.getElementById('width-input').value);
      const heightMm = Number(document.getElementById('height-input').value);
      vscode.postMessage({ type: 'changeDimensions', widthMm, heightMm });
    });
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'changePage', page: ${state.currentPage - 1} });
    });
    document.getElementById('next-page-btn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'changePage', page: ${state.currentPage + 1} });
    });
  </script>
</body>
</html>`;
}
