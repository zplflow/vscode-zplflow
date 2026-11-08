import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  ZplflowClient,
  RateLimitError,
  type FetchLike,
  type HttpResponseLike,
} from '../client/zplflowClient';

describe('ZplflowClient', () => {
  it('sends preview request with DPI and dimensions and caches response', async () => {
    let calls = 0;
    let capturedBody = '';

    const mockFetch: FetchLike = async (_url, init) => {
      calls++;
      capturedBody = init.body;
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'X-RateLimit-Remaining' ? '29' : null),
        },
        json: async () => ({
          zpl: '^XA^FDHello^FS^XZ',
          png_base64: 'iVBORw0KGgo=',
          page_count: 1,
          current_page: 0,
        }),
        text: async () => '',
      } satisfies HttpResponseLike;
    };

    const client = new ZplflowClient(10, mockFetch);
    const first = await client.renderPreview('https://api.zplflow.com/', 'zpl_test_key', {
      zpl: '^XA^FDHello^FS^XZ',
      dpi: 300,
      widthMm: 100,
      heightMm: 150,
    });

    assert.equal(first.fromCache, false);
    assert.equal(first.pngBase64, 'iVBORw0KGgo=');
    assert.equal(first.rateLimitRemaining, 29);
    assert.equal(calls, 1);

    const parsedReq = JSON.parse(capturedBody);
    assert.equal(parsedReq.dpi, 300);
    assert.equal(parsedReq.width_mm, 100);
    assert.equal(parsedReq.height_mm, 150);

    const second = await client.renderPreview('https://api.zplflow.com/', 'zpl_test_key', {
      zpl: '^XA^FDHello^FS^XZ',
      dpi: 300,
      widthMm: 100,
      heightMm: 150,
    });
    assert.equal(second.fromCache, true);
    assert.equal(calls, 1);
  });

  it('throws RateLimitError with retryAfterSeconds on HTTP 429', async () => {
    const mockFetch: FetchLike = async () => ({
      ok: false,
      status: 429,
      headers: {
        get: (name: string) => (name === 'Retry-After' ? '12' : null),
      },
      json: async () => ({}),
      text: async () => 'rate limit exceeded',
    });

    const client = new ZplflowClient(10, mockFetch);
    await assert.rejects(
      async () => {
        await client.renderPreview('https://api.zplflow.com', 'zpl_key', {
          zpl: '^XA^XZ',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof RateLimitError);
        assert.equal(err.retryAfterSeconds, 12);
        return true;
      }
    );
  });
});
