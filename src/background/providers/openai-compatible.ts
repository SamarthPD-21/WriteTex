import { fetchWithRetry } from './http';
import { parseSseStream } from './stream-parser';
import { FinishReason, StreamPart } from './types';

export function mapOpenAIFinishReason(reason: string | null | undefined): FinishReason | undefined {
  if (!reason) return undefined;
  if (reason === 'stop') return 'complete';
  if (reason === 'length') return 'truncated';
  if (reason === 'content_filter') return 'refused';
  return 'unknown';
}

/**
 * Streams a Chat Completions endpoint (OpenAI and OpenAI-compatible APIs such as Meta's).
 */
export async function* streamChatCompletions(
  url: string,
  label: string,
  apiKey: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
): AsyncGenerator<StreamPart> {
  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...payload, stream: true }),
    },
    label,
    signal
  );

  yield* parseSseStream(
    response,
    (data) => {
      if (data.error) throw new Error(data.error.message || `${label} stream error`);
      const choice = data.choices?.[0];
      if (!choice) return undefined;
      const parts: StreamPart[] = [];
      if (choice.delta?.content) parts.push({ type: 'text', text: choice.delta.content });
      const reason = mapOpenAIFinishReason(choice.finish_reason);
      if (reason) parts.push({ type: 'finish', reason });
      return parts;
    },
    signal
  );
}
