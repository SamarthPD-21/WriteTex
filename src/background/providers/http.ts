const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
const MAX_ATTEMPTS = 3;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

function retryDelayMs(res: Response | null, attempt: number): number {
  const header = res?.headers.get('retry-after');
  const seconds = header ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 15000);
  return Math.min(800 * 2 ** attempt, 8000) + Math.random() * 250;
}

/**
 * fetch() with retries for rate limits, overloads, and transient network failures.
 * Retries happen before any output streams, so they are invisible to the user
 * apart from latency. Non-retryable failures become readable errors.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  signal?: AbortSignal
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(url, { ...init, signal });
    } catch (err) {
      if (signal?.aborted || attempt + 1 >= MAX_ATTEMPTS) throw err;
    }

    if (res?.ok) return res;
    if (res && (!RETRYABLE_STATUS.has(res.status) || attempt + 1 >= MAX_ATTEMPTS)) {
      throw await toProviderError(res, label);
    }
    await sleep(retryDelayMs(res, attempt), signal);
  }
}

export class ProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Turns an HTTP error response into a message a user can act on. */
export async function toProviderError(res: Response, label: string): Promise<ProviderError> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message || body?.message || '';
  } catch {
    // Non-JSON error body
  }

  switch (res.status) {
    case 401:
    case 403:
      return new ProviderError(`${label} rejected the API key (HTTP ${res.status}). Check it in WriteTex Settings.${detail ? ` ${detail}` : ''}`, res.status);
    case 404:
      return new ProviderError(`${label}: model not found or not available to this API key.${detail ? ` ${detail}` : ''}`, res.status);
    case 429:
      return new ProviderError(`${label} rate limit reached — wait a moment and try again.${detail ? ` ${detail}` : ''}`, res.status);
    case 529:
      return new ProviderError(`${label} is overloaded right now — try again shortly.`, res.status);
    default:
      return new ProviderError(detail || `${label} API error: HTTP ${res.status}`, res.status);
  }
}
