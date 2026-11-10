import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('zplflow Language Server');
  }
  return outputChannel;
}

export async function startLspClient(serverBinaryPath: string): Promise<LanguageClient> {
  const channel = getOutputChannel();
  channel.appendLine(`[zplflow-lsp] Starting Language Server binary from: ${serverBinaryPath}`);

  const serverOptions: ServerOptions = {
    run: {
      command: serverBinaryPath,
      transport: TransportKind.stdio,
      args: [],
    },
    debug: {
      command: serverBinaryPath,
      transport: TransportKind.stdio,
      args: [],
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'zpl' },
      { scheme: 'untitled', language: 'zpl' },
    ],
    outputChannel: channel,
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{zpl,prn,label}'),
    },
  };

  client = new LanguageClient(
    'zplflowLsp',
    'zplflow Language Server',
    serverOptions,
    clientOptions
  );

  try {
    await client.start();
    channel.appendLine('[zplflow-lsp] Language Server initialized successfully.');
  } catch (err) {
    channel.appendLine(`[zplflow-lsp] Failed to start server: ${String(err)}`);
    throw err;
  }

  return client;
}

export async function stopLspClient(): Promise<void> {
  if (client) {
    const c = client;
    client = undefined;
    getOutputChannel().appendLine('[zplflow-lsp] Stopping Language Server...');
    await c.stop();
    getOutputChannel().appendLine('[zplflow-lsp] Language Server stopped.');
  }
}

export function isLspRunning(): boolean {
  return client !== undefined && client.isRunning();
}
