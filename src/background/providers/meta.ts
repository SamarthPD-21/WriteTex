import { streamChatCompletions } from './openai-compatible';
import { ProviderRequest, StreamPart } from './types';

export function streamMeta(req: ProviderRequest): AsyncGenerator<StreamPart> {
  return streamChatCompletions(
    'https://api.meta.ai/v1/chat/completions',
    'Meta',
    req.apiKey,
    {
      model: req.model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      max_tokens: req.maxOutputTokens,
      temperature: req.temperature,
    },
    req.signal
  );
}

export async function validateMetaKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.meta.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
