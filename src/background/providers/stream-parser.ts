import { StreamPart } from './types';

/**
 * Parses an SSE (Server-Sent Events) response into stream parts. `extract` maps
 * one decoded `data:` payload to zero or more parts.
 */
export async function* parseSseStream(
  response: Response,
  extract: (parsedJson: any) => StreamPart | StreamPart[] | undefined,
  signal?: AbortSignal
): AsyncGenerator<StreamPart> {
  if (!response.body) {
    throw new Error('Response body is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const onAbort = () => reader.cancel().catch(() => {});
  signal?.addEventListener('abort', onAbort, { once: true });

  function* handleLine(line: string): Generator<StreamPart> {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return; // comments, pings, event: lines
    const dataStr = trimmed.slice(5).trim();
    if (!dataStr || dataStr === '[DONE]') return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      return; // SSE data lines are complete JSON; skip anything malformed
    }
    const parts = extract(parsed);
    if (!parts) return;
    for (const part of Array.isArray(parts) ? parts : [parts]) {
      if (part.type === 'text' && !part.text) continue;
      yield part;
    }
  }

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) yield* handleLine(line);
    }

    if (!signal?.aborted) {
      buffer += decoder.decode();
      yield* handleLine(buffer);
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    try {
      reader.releaseLock();
    } catch {
      // Ignore
    }
  }
}
