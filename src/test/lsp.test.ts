import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import {
  getPlatformArchNames,
  isExecutable,
  findInPath,
  resolveServerBinary,
} from '../lsp/serverResolver';

describe('LSP serverResolver', () => {
  it('detects platform and architecture accurately', () => {
    const { platform, arch, ext } = getPlatformArchNames();
    assert.ok(['linux', 'darwin', 'windows'].includes(platform));
    assert.ok(['amd64', 'arm64'].includes(arch));
    if (process.platform === 'win32') {
      assert.equal(ext, '.exe');
      assert.equal(platform, 'windows');
    } else {
      assert.equal(ext, '');
    }
  });

  it('correctly verifies if a file is executable', () => {
    // Non-existent file
    assert.equal(isExecutable('/path/to/non/existent/file/zplflow_xyz'), false);

    // Directory
    assert.equal(isExecutable(os.tmpdir()), false);

    // Existing executable (node itself)
    assert.equal(isExecutable(process.execPath), true);
  });

  it('locates executable in system PATH', () => {
    // 'node' is guaranteed to be in PATH
    const nodeBinary = process.platform === 'win32' ? 'node.exe' : 'node';
    const found = findInPath(nodeBinary);
    assert.ok(found !== undefined, 'Should find node in PATH');
    assert.ok(isExecutable(found));
  });

  it('resolves binary from local monorepo dist when available', async () => {
    // Fake ExtensionContext
    const mockContext: any = {
      extensionPath: path.resolve(__dirname, '..', '..'),
      asAbsolutePath: (rel: string) => path.join(path.resolve(__dirname, '..', '..'), rel),
    };

    const resolved = await resolveServerBinary(mockContext);
    if (resolved) {
      assert.ok(isExecutable(resolved.binaryPath));
      assert.ok(
        ['config', 'bundled', 'env', 'userCache', 'path', 'workspace'].includes(resolved.source)
      );
    }
  });

  it('respects environment variable ZPLFLOW_LSP_PATH override', async () => {
    const prev = process.env.ZPLFLOW_LSP_PATH;
    try {
      // Use current node binary as dummy executable
      process.env.ZPLFLOW_LSP_PATH = process.execPath;
      const mockContext: any = {
        extensionPath: path.resolve(__dirname, '..', '..'),
        asAbsolutePath: (rel: string) => path.join(path.resolve(__dirname, '..', '..'), rel),
      };

      const resolved = await resolveServerBinary(mockContext);
      assert.ok(resolved !== undefined);
      assert.equal(resolved.source, 'env');
      assert.equal(resolved.binaryPath, process.execPath);
    } finally {
      if (prev === undefined) {
        delete process.env.ZPLFLOW_LSP_PATH;
      } else {
        process.env.ZPLFLOW_LSP_PATH = prev;
      }
    }
  });
});
