import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface BinaryResolutionResult {
  binaryPath: string;
  source: 'config' | 'bundled' | 'env' | 'userCache' | 'path' | 'workspace';
}

export interface ResolveOptions {
  configuredPath?: string;
  extensionPath: string;
  asAbsolutePath: (rel: string) => string;
  workspaceRoot?: string;
  onWarning?: (msg: string) => void;
}

export function getPlatformArchNames(): { platform: string; arch: string; ext: string } {
  const p = process.platform;
  let platform = 'linux';
  let ext = '';

  if (p === 'win32') {
    platform = 'windows';
    ext = '.exe';
  } else if (p === 'darwin') {
    platform = 'darwin';
  } else if (p === 'linux') {
    platform = 'linux';
  }

  const a: string = process.arch;
  let arch = 'amd64';
  if (a === 'arm64' || a === 'aarch64') {
    arch = 'arm64';
  } else if (a === 'x64') {
    arch = 'amd64';
  }

  return { platform, arch, ext };
}

export function isExecutable(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return false;
    }
    if (process.platform === 'win32') {
      return true;
    }
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function findInPath(binaryName: string): string | undefined {
  const envPath = process.env.PATH;
  if (!envPath) {
    return undefined;
  }
  const dirs = envPath.split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) {
      continue;
    }
    const fullPath = path.join(dir, binaryName);
    if (isExecutable(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

export function resolveServerBinaryWithOptions(
  options: ResolveOptions
): BinaryResolutionResult | undefined {
  const configuredPath = options.configuredPath?.trim();

  // 1. User configured path
  if (configuredPath) {
    const resolvedPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(options.workspaceRoot ?? '.', configuredPath);

    if (isExecutable(resolvedPath)) {
      return { binaryPath: resolvedPath, source: 'config' };
    }
    if (options.onWarning) {
      options.onWarning(
        `zplflow: Configured LSP binary not found or not executable at "${configuredPath}". Searching defaults...`
      );
    }
  }

  const { platform, arch, ext } = getPlatformArchNames();
  const platformBinaryName = `zplflow-lsp-${platform}-${arch}${ext}`;
  const genericBinaryName = `zplflow-lsp${ext}`;

  // 2. Bundled inside extension's bin/ folder
  const bundledPlatformPath = options.asAbsolutePath(path.join('bin', platformBinaryName));
  if (isExecutable(bundledPlatformPath)) {
    return { binaryPath: bundledPlatformPath, source: 'bundled' };
  }
  const bundledGenericPath = options.asAbsolutePath(path.join('bin', genericBinaryName));
  if (isExecutable(bundledGenericPath)) {
    return { binaryPath: bundledGenericPath, source: 'bundled' };
  }

  // 3. Environment variable override
  const envOverride = process.env.ZPLFLOW_LSP_PATH;
  if (envOverride && isExecutable(envOverride)) {
    return { binaryPath: envOverride, source: 'env' };
  }

  // 4. Local workspace / dev monorepo build check
  const localDevCandidates = [
    path.resolve(options.extensionPath, '..', 'zplflow', 'dist', platformBinaryName),
    path.resolve(options.extensionPath, '..', 'zplflow', 'bin', genericBinaryName),
    path.resolve(options.extensionPath, '..', 'zplflow', 'cmd', 'zplflow-lsp', genericBinaryName),
  ];
  for (const cand of localDevCandidates) {
    if (isExecutable(cand)) {
      return { binaryPath: cand, source: 'workspace' };
    }
  }

  // 5. System PATH lookup
  const inPath = findInPath(genericBinaryName) || findInPath(platformBinaryName);
  if (inPath) {
    return { binaryPath: inPath, source: 'path' };
  }

  // 6. User cache directory (~/.zplflow/bin/zplflow-lsp)
  const homeDir = os.homedir();
  const userCachePlatform = path.join(homeDir, '.zplflow', 'bin', platformBinaryName);
  if (isExecutable(userCachePlatform)) {
    return { binaryPath: userCachePlatform, source: 'userCache' };
  }
  const userCacheGeneric = path.join(homeDir, '.zplflow', 'bin', genericBinaryName);
  if (isExecutable(userCacheGeneric)) {
    return { binaryPath: userCacheGeneric, source: 'userCache' };
  }

  return undefined;
}

export async function resolveServerBinary(
  context: { extensionPath: string; asAbsolutePath: (rel: string) => string }
): Promise<BinaryResolutionResult | undefined> {
  // Dynamically load vscode if running in extension host
  let configuredPath = '';
  let workspaceRoot: string | undefined;
  let onWarning: ((msg: string) => void) | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vscode = require('vscode') as typeof import('vscode');
    const cfg = vscode.workspace.getConfiguration('zplflow');
    configuredPath = cfg.get<string>('lsp.path', '');
    workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    onWarning = (msg: string) => void vscode.window.showWarningMessage(msg);
  } catch {
    // Outside VS Code host (e.g. tests)
  }

  return resolveServerBinaryWithOptions({
    configuredPath,
    extensionPath: context.extensionPath,
    asAbsolutePath: (rel: string) => context.asAbsolutePath(rel),
    workspaceRoot,
    onWarning,
  });
}
