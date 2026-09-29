import { fetchWithRetry } from './http';
import { parseSseStream } from './stream-parser';
import { FinishReason, ProviderRequest, StreamPart } from './types';

// Current-generation models reject temperature/top_p/top_k with a 400
const NO_SAMPLING_PARAMS = /^claude-(?:opus-5|opus-4-[78]|sonnet-5|fable|mythos)/;
// Models that accept output_config.effort (Haiku 4.5 rejects it)
const SUPPORTS_EFFORT = /^claude-(?:opus-5|opus-4-[5-8]|sonnet-5|sonnet-4-6|fable|mythos)/;
// Models that take the server-side refusal fallback
const SUPPORTS_FALLBACK = /^claude-(?:opus-5$|fable-5-1)/;

function mapStopReason(reason: string | null | undefined): FinishReason | undefined {
  if (!reason) return undefined;
  if (reason === 'end_turn' || reason === 'stop_sequence') return 'complete';
  if (reason === 'max_tokens') return 'truncated';
  if (reason === 'refusal') return 'refused';
  return 'unknown';
}

export async function* streamAnthropic(req: ProviderRequest): AsyncGenerator<StreamPart> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': req.apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  const payload: Record<string, unknown> = {
    model: req.model,
    max_tokens: req.maxOutputTokens,
    // The system prompt is identical across requests, so cache it
    system: [{ type: 'text', text: req.systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: req.userPrompt }],
    stream: true,
  };

  if (!NO_SAMPLING_PARAMS.test(req.model)) {
    payload.temperature = req.temperature;
  }
  if (SUPPORTS_EFFORT.test(req.model)) {
    // Editing turns are latency-sensitive; medium keeps quality while cutting wait time
    payload.output_config = { effort: 'medium' };
  }
  if (SUPPORTS_FALLBACK.test(req.model)) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    payload.fallbacks = 'default';
  }

  const response = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    { method: 'POST', headers, body: JSON.stringify(payload) },
    'Anthropic',
    req.signal
  );

  yield* parseSseStream(
    response,
    (data) => {
      if (data.type === 'error') {
        throw new Error(data.error?.message || 'Anthropic stream error');
      }
      if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
        return { type: 'text', text: data.delta.text };
      }
      if (data.type === 'message_delta') {
        const reason = mapStopReason(data.delta?.stop_reason);
        if (reason) return { type: 'finish', reason };
      }
      return undefined;
    },
    req.signal
  );
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    // Anything but an auth failure means the key itself is valid
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}
