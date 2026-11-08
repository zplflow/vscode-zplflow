import * as vscode from 'vscode';
import { ZplflowClient } from './client/zplflowClient';
import { ZplPreviewPanel } from './webview/previewPanel';

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function isZplDocument(doc: vscode.TextDocument): boolean {
  if (doc.languageId === 'zpl') {
    return true;
  }
  const lower = doc.fileName.toLowerCase();
  return lower.endsWith('.zpl') || lower.endsWith('.prn') || lower.endsWith('.label');
}

export function activate(context: vscode.ExtensionContext): void {
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

  context.subscriptions.push(openPreviewCmd, saveListener, changeListener);
}

export function deactivate(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
}
