import { afterEach, describe, expect, it, vi } from 'vitest';
import { streamAnthropic } from '../src/background/providers/anthropic';
import { streamOpenAI } from '../src/background/providers/openai';
import { streamGemini } from '../src/background/providers/gemini';
import { StreamPart } from '../src/background/providers/types';

function sseResponse(events: unknown[], status = 200): Response {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

async function collect(gen: AsyncGenerator<StreamPart>) {
  let text = '';
  let finish: string | undefined;
  for await (const part of gen) {
    if (part.type === 'text') text += part.text;
    else finish = part.reason;
  }
  return { text, finish };
}

const base = { apiKey: 'k', systemPrompt: 'sys', userPrompt: 'hi', temperature: 0.2, maxOutputTokens: 1000 };

afterEach(() => vi.unstubAllGlobals());

describe('Providers', () => {
  it('Anthropic: streams text, reports truncation, and omits temperature on current models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } },
        { type: 'message_delta', delta: { stop_reason: 'max_tokens' } },
      ])
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await collect(streamAnthropic({ ...base, model: 'claude-sonnet-5' }));
    expect(result).toEqual({ text: 'Hello world', finish: 'truncated' });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.temperature).toBeUndefined();
    expect(payload.system[0].cache_control).toEqual({ type: 'ephemeral' });

    fetchMock.mockResolvedValue(sseResponse([{ type: 'message_delta', delta: { stop_reason: 'end_turn' } }]));
    await collect(streamAnthropic({ ...base, model: 'claude-haiku-4-5' }));
    const haikuPayload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(haikuPayload.temperature).toBe(0.2);
    expect(haikuPayload.output_config).toBeUndefined();
  });

  it('retries rate limits before streaming, then gives a readable error for bad keys', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(sseResponse([{ choices: [{ delta: { content: 'ok' }, finish_reason: 'stop' }] }]));
    vi.stubGlobal('fetch', fetchMock);
    const pending = collect(streamOpenAI({ ...base, model: 'gpt-4o' }));
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ text: 'ok', finish: 'complete' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'bad' } }), { status: 401 })));
    await expect(collect(streamOpenAI({ ...base, model: 'gpt-4o' }))).rejects.toThrow(/rejected the API key/);
  });

  it('OpenAI: reasoning models get no temperature', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([{ choices: [{ delta: {}, finish_reason: 'length' }] }]));
    vi.stubGlobal('fetch', fetchMock);
    const result = await collect(streamOpenAI({ ...base, model: 'o3-mini' }));
    expect(result.finish).toBe('truncated');
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.temperature).toBeUndefined();
    expect(payload.max_completion_tokens).toBe(1000);
  });

  it('Gemini: sends the key in a header and maps safety stops to refusals', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([{ candidates: [{ content: { parts: [{ text: 'x' }, { text: 'hidden', thought: true }] }, finishReason: 'SAFETY' }] }])
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await collect(streamGemini({ ...base, model: 'gemini-2.0-flash' }));
    expect(result).toEqual({ text: 'x', finish: 'refused' });
    expect(fetchMock.mock.calls[0][0]).not.toContain('key=');
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('k');
  });
});
