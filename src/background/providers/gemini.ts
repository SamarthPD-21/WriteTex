import { fetchWithRetry, ProviderError } from './http';
import { parseSseStream } from './stream-parser';
import { FinishReason, ProviderRequest, StreamPart } from './types';

/**
 * Normalizes model names for Google AI Studio API.
 */
export function resolveGeminiModel(model: string): string {
  const clean = (model || '').replace(/^models\//, '').trim();
  if (!clean) return 'gemini-3.8-flash';
  return clean;
}

function mapFinishReason(reason: string | undefined): FinishReason | undefined {
  if (!reason || reason === 'FINISH_REASON_UNSPECIFIED') return undefined;
  if (reason === 'STOP') return 'complete';
  if (reason === 'MAX_TOKENS') return 'truncated';
  if (/SAFETY|RECITATION|PROHIBITED|BLOCKLIST|SPII/.test(reason)) return 'refused';
  return 'unknown';
}

export async function* streamGemini(req: ProviderRequest): AsyncGenerator<StreamPart> {
  const targetModel = resolveGeminiModel(req.model);
  const url = (m: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse`;

  const payload: any = {
    contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
    systemInstruction: { parts: [{ text: req.systemPrompt }] },
    generationConfig: {
      temperature: req.temperature,
      maxOutputTokens: req.maxOutputTokens,
      // Editing turns are latency-sensitive: skip thinking where the model allows it
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const send = (model: string) =>
    fetchWithRetry(
      url(model),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': req.apiKey },
        body: JSON.stringify(payload),
      },
      'Gemini',
      req.signal
    );

  let response: Response;
  try {
    response = await send(targetModel);
  } catch (err) {
    // Some models reject a zero thinking budget; retry once without it
    if (!(err instanceof ProviderError) || err.status !== 400 || req.signal?.aborted) throw err;
    delete payload.generationConfig.thinkingConfig;
    response = await send(targetModel);
  }

  yield* parseSseStream(
    response,
    (data) => {
      if (data.error) throw new Error(data.error.message || 'Gemini stream error');
      const candidate = data.candidates?.[0];
      if (!candidate) return undefined;
      const parts: StreamPart[] = [];
      const text = (candidate.content?.parts || [])
        .filter((p: any) => !p.thought && typeof p.text === 'string')
        .map((p: any) => p.text)
        .join('');
      if (text) parts.push({ type: 'text', text });
      const reason = mapFinishReason(candidate.finishReason);
      if (reason) parts.push({ type: 'finish', reason });
      return parts;
    },
    req.signal
  );
}

export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
