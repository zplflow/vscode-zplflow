import * as vscode from 'vscode';
import { ZplflowClient } from './client/zplflowClient';
import { ZplPreviewPanel } from './webview/previewPanel';
import { resolveServerBinary } from './lsp/serverResolver';
import { startLspClient, stopLspClient, getOutputChannel } from './lsp/lspClient';

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function isZplDocument(doc: vscode.TextDocument): boolean {
  if (doc.languageId === 'zpl') {
    return true;
  }
  const lower = doc.fileName.toLowerCase();
  return lower.endsWith('.zpl') || lower.endsWith('.prn') || lower.endsWith('.label');
}

async function initLsp(context: vscode.ExtensionContext): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('zplflow');
  const enabled = cfg.get<boolean>('lsp.enabled', true);
  if (!enabled) {
    getOutputChannel().appendLine('[zplflow-lsp] Language Server is disabled in settings (zplflow.lsp.enabled = false).');
    return;
  }

  const result = await resolveServerBinary(context);
  if (!result) {
    getOutputChannel().appendLine('[zplflow-lsp] zplflow-lsp binary not found. Autocompletion and signature help are disabled.');
    return;
  }

  getOutputChannel().appendLine(`[zplflow-lsp] Found binary via "${result.source}": ${result.binaryPath}`);
  try {
    await startLspClient(result.binaryPath);
  } catch (err) {
    void vscode.window.showErrorMessage(`zplflow: Failed to start Language Server (${String(err)})`);
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const client = new ZplflowClient();

  const openPreviewCmd = vscode.commands.registerCommand(
    'zplflow.openPreview',
    async () => {
      const panel = ZplPreviewPanel.createOrShow(client);
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await panel.renderZpl(editor.document.getText());
      }
    }
  );

  const restartLspCmd = vscode.commands.registerCommand(
    'zplflow.restartLsp',
    async () => {
      await stopLspClient();
      await initLsp(context);
      void vscode.window.showInformationMessage('zplflow: Language Server restarted.');
    }
  );

  const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (!ZplPreviewPanel.currentPanel || !isZplDocument(doc)) {
      return;
    }
    await ZplPreviewPanel.currentPanel.renderZpl(doc.getText());
  });

  const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    if (!ZplPreviewPanel.currentPanel || !isZplDocument(event.document)) {
      return;
    }
    const cfg = vscode.workspace.getConfiguration('zplflow');
    const renderMode = cfg.get<string>('renderMode', 'onSave');
    if (renderMode !== 'onType') {
      return;
    }
    const delay = Math.max(150, cfg.get<number>('debounceMs', 450));
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const text = event.document.getText();
    debounceTimer = setTimeout(() => {
      void ZplPreviewPanel.currentPanel?.renderZpl(text);
    }, delay);
  });

  const configListener = vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration('zplflow.lsp.enabled') || e.affectsConfiguration('zplflow.lsp.path')) {
      await stopLspClient();
      await initLsp(context);
    }
  });

  context.subscriptions.push(
    openPreviewCmd,
    restartLspCmd,
    saveListener,
    changeListener,
    configListener
  );

  // Initialize Language Server
  void initLsp(context);
}

export async function deactivate(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  await stopLspClient();
}
