import { streamChatCompletions } from './openai-compatible';
import { ProviderRequest, StreamPart } from './types';

/** Reasoning models (o-series, GPT-5 family) reject custom temperature. */
export function isOpenAIReasoningModel(model: string): boolean {
  return /^(?:o\d|gpt-5)/.test(model);
}

export function streamOpenAI(req: ProviderRequest): AsyncGenerator<StreamPart> {
  const reasoning = isOpenAIReasoningModel(req.model);
  // o1 / o1-mini predate system-message support
  const legacy = /^o1(?:-mini|-preview)?$/.test(req.model);

  const messages = legacy
    ? [{ role: 'user', content: `${req.systemPrompt}\n\n${req.userPrompt}` }]
    : [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ];

  return streamChatCompletions(
    'https://api.openai.com/v1/chat/completions',
    'OpenAI',
    req.apiKey,
    {
      model: req.model,
      messages,
      max_completion_tokens: req.maxOutputTokens,
      ...(reasoning ? {} : { temperature: req.temperature }),
    },
    req.signal
  );
}

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
