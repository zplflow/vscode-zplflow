import * as vscode from 'vscode';
import {
  ZplflowClient,
  type SupportedDPI,
} from '../client/zplflowClient';
import { buildPreviewHtml, type PreviewViewState } from './htmlTemplate';

export class ZplPreviewPanel {
  public static currentPanel: ZplPreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly client: ZplflowClient;
  private disposables: vscode.Disposable[] = [];
  private state: PreviewViewState;
  private lastZpl = '';

  private constructor(panel: vscode.WebviewPanel, client: ZplflowClient) {
    this.panel = panel;
    this.client = client;

    const cfg = vscode.workspace.getConfiguration('zplflow');
    this.state = {
      dpi: (cfg.get<number>('dpi', 203) as SupportedDPI) || 203,
      widthMm: cfg.get<number>('widthMm', 101.6),
      heightMm: cfg.get<number>('heightMm', 152.4),
      currentPage: 0,
      pageCount: 1,
    };

    this.updateWebview();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      async (msg: {
        type: string;
        dpi?: SupportedDPI;
        widthMm?: number;
        heightMm?: number;
        page?: number;
      }) => {
        if (msg.type === 'changeDpi' && msg.dpi) {
          this.state.dpi = msg.dpi;
          await this.renderZpl(this.lastZpl);
        } else if (msg.type === 'changeDimensions') {
          if (msg.widthMm && msg.widthMm > 0) {
            this.state.widthMm = msg.widthMm;
          }
          if (msg.heightMm && msg.heightMm > 0) {
            this.state.heightMm = msg.heightMm;
          }
          await this.renderZpl(this.lastZpl);
        } else if (msg.type === 'changePage' && msg.page !== undefined) {
          this.state.currentPage = Math.max(0, msg.page);
          await this.renderZpl(this.lastZpl);
        }
      },
      null,
      this.disposables
    );
  }

  public static createOrShow(client: ZplflowClient): ZplPreviewPanel {
    const column = vscode.ViewColumn.Beside;
    if (ZplPreviewPanel.currentPanel) {
      ZplPreviewPanel.currentPanel.panel.reveal(column, true);
      return ZplPreviewPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'zplflowPreview',
      'zplflow Live Preview',
      { viewColumn: column, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true }
    );

    ZplPreviewPanel.currentPanel = new ZplPreviewPanel(panel, client);
    return ZplPreviewPanel.currentPanel;
  }

  public async renderZpl(zpl: string): Promise<void> {
    this.lastZpl = zpl;
    if (!zpl || zpl.trim() === '') {
      this.state.pngBase64 = undefined;
      this.state.errorMessage = undefined;
      this.updateWebview();
      return;
    }

    const cfg = vscode.workspace.getConfiguration('zplflow');
    const apiKey = cfg.get<string>('apiKey', '');
    const apiUrl = cfg.get<string>('apiUrl', 'https://api.zplflow.io');

    this.state.loading = true;
    this.state.errorMessage = undefined;
    this.updateWebview();

    try {
      const result = await this.client.renderPreview(apiUrl, apiKey, {
        zpl,
        dpi: this.state.dpi,
        widthMm: this.state.widthMm,
        heightMm: this.state.heightMm,
        page: this.state.currentPage,
      });

      this.state.loading = false;
      this.state.pngBase64 = result.pngBase64;
      this.state.pageCount = result.pageCount;
      this.state.currentPage = result.currentPage;
      this.state.fromCache = result.fromCache;
      this.state.rateLimitRemaining = result.rateLimitRemaining;
    } catch (err: unknown) {
      this.state.loading = false;
      this.state.errorMessage =
        err instanceof Error ? err.message : String(err);
    }

    this.updateWebview();
  }

  private updateWebview(): void {
    this.panel.webview.html = buildPreviewHtml(this.state);
  }

  public dispose(): void {
    ZplPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }
}
