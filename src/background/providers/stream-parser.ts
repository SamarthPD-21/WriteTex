/**
 * Parses an SSE (Server-Sent Events) ReadableStream into text delta chunks.
 */
export async function* parseSseStream(
  response: Response,
  extractDelta: (parsedJson: any) => string | undefined,
  signal?: AbortSignal
): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error('Response body is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          // Ignore
        }
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      // Keep trailing incomplete chunk in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (signal?.aborted) break;

        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) {
          continue; // SSE comment or ping
        }

        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = extractDelta(parsed);
            if (delta) {
              yield delta;
            }
          } catch {
            // Buffer may hold partial JSON, next read will complete
          }
        }
      }
    }

    // Process remainder if not aborted
    if (!signal?.aborted && buffer.trim().startsWith('data:')) {
      const dataStr = buffer.trim().slice(5).trim();
      if (dataStr && dataStr !== '[DONE]') {
        try {
          const parsed = JSON.parse(dataStr);
          const delta = extractDelta(parsed);
          if (delta) {
            yield delta;
          }
        } catch {
          // Ignore
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Ignore
    }
  }
}
