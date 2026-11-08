import * as crypto from 'node:crypto';

export type SupportedDPI = 152 | 203 | 300 | 600;

export interface PreviewRequestOptions {
  zpl: string;
  dpi?: SupportedDPI;
  widthMm?: number;
  heightMm?: number;
  page?: number;
}

export interface PreviewResponseData {
  zpl: string;
  pngBase64: string;
  pageCount: number;
  currentPage: number;
  fromCache: boolean;
  rateLimitRemaining?: number;
}

export class RateLimitError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface HttpResponseLike {
  ok: boolean;
  status: number;
  headers: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) => Promise<HttpResponseLike>;

export class ZplflowClient {
  private readonly cache = new Map<string, PreviewResponseData>();
  private readonly maxCacheEntries: number;
  private readonly fetchFn: FetchLike;

  constructor(maxCacheEntries = 50, fetchFn?: FetchLike) {
    this.maxCacheEntries = maxCacheEntries;
    this.fetchFn = fetchFn ?? (globalThis.fetch as unknown as FetchLike);
  }

  public static computeCacheKey(opts: PreviewRequestOptions): string {
    const payload = JSON.stringify({
      zpl: opts.zpl,
      dpi: opts.dpi ?? 203,
      widthMm: opts.widthMm ?? 101.6,
      heightMm: opts.heightMm ?? 152.4,
      page: opts.page ?? 0,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public async renderPreview(
    baseUrl: string,
    apiKey: string,
    opts: PreviewRequestOptions
  ): Promise<PreviewResponseData> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Missing zplflow API key. Configure "zplflow.apiKey" in Settings.');
    }

    const cacheKey = ZplflowClient.computeCacheKey(opts);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Refresh LRU order
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      return { ...cached, fromCache: true };
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/v1/pipelines/preview`;

    const requestBody: Record<string, unknown> = {
      zpl: opts.zpl,
      steps: [],
      page: opts.page ?? 0,
      dpi: opts.dpi ?? 203,
    };
    if (opts.widthMm !== undefined && opts.widthMm > 0) {
      requestBody.width_mm = opts.widthMm;
    }
    if (opts.heightMm !== undefined && opts.heightMm > 0) {
      requestBody.height_mm = opts.heightMm;
    }

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 429) {
      const retryHeader = response.headers.get('Retry-After') ?? '5';
      const retrySec = Math.max(1, parseInt(retryHeader, 10) || 5);
      throw new RateLimitError(
        `Rate limit exceeded. Retry in ${retrySec} seconds.`,
        retrySec
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Preview request failed (HTTP ${response.status}): ${errText}`);
    }

    const raw = (await response.json()) as {
      zpl: string;
      png_base64: string;
      page_count: number;
      current_page: number;
    };

    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    const rateLimitRemaining =
      remainingHeader !== null ? parseInt(remainingHeader, 10) : undefined;

    const result: PreviewResponseData = {
      zpl: raw.zpl,
      pngBase64: raw.png_base64,
      pageCount: raw.page_count,
      currentPage: raw.current_page,
      fromCache: false,
      rateLimitRemaining: Number.isNaN(rateLimitRemaining) ? undefined : rateLimitRemaining,
    };

    if (this.cache.size >= this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(cacheKey, result);

    return result;
  }
}
