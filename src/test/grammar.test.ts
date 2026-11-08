import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Locates the ZPL TextMate grammar file.
 *
 * Tests are compiled into a temporary build directory (e.g.
 * `/tmp/vscode-zplflow-build/test`), so a path relative to `__dirname` does not
 * necessarily point back into the repository. Walk up from the compiled test
 * location and from the current working directory until the grammar is found.
 */
function resolveGrammarPath(): string {
  const relative = path.join('syntaxes', 'zpl.tmLanguage.json');
  const starts = [__dirname, process.cwd()];

  for (const start of starts) {
    let current = path.resolve(start);
    for (;;) {
      const candidate = path.join(current, relative);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  throw new Error(`Unable to locate ${relative} from ${starts.join(', ')}`);
}

describe('ZPL TextMate Grammar', () => {
  it('contains valid repository patterns for ZPL commands', () => {
    const grammarPath = resolveGrammarPath();
    const raw = fs.readFileSync(grammarPath, 'utf-8');
    const grammar = JSON.parse(raw);

    assert.equal(grammar.scopeName, 'source.zpl');
    assert.ok(Array.isArray(grammar.patterns));
    assert.ok(grammar.patterns.length >= 6);
    assert.ok(grammar.repository['label-bounds']);
    assert.ok(grammar.repository['barcodes']);
    assert.ok(grammar.repository['graphics']);
  });
});
