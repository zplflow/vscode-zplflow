import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { buildPreviewHtml } from '../webview/htmlTemplate';

describe('buildPreviewHtml', () => {
  it('renders base64 image, selected DPI, and cached badge', () => {
    const html = buildPreviewHtml({
      pngBase64: 'iVBORw0KGgo=',
      dpi: 300,
      widthMm: 100,
      heightMm: 150,
      currentPage: 0,
      pageCount: 2,
      fromCache: true,
    });

    assert.ok(html.includes('data:image/png;base64,iVBORw0KGgo='));
    assert.ok(html.includes('<option value="300" selected>300 DPI</option>'));
    assert.ok(html.includes('Cached (0ms)'));
    assert.ok(html.includes('Page 1 / 2'));
  });

  it('escapes HTML in error messages', () => {
    const html = buildPreviewHtml({
      dpi: 203,
      widthMm: 101.6,
      heightMm: 152.4,
      currentPage: 0,
      pageCount: 1,
      errorMessage: '<script>alert("xss")</script>',
    });

    assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
    assert.ok(!html.includes('<script>alert("xss")</script>'));
  });
});
