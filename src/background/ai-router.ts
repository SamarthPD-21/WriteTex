import { GenerateRequest } from '../messaging/types';
import { getStoredSettings } from './key-store';
import { buildPrompt } from '../prompts/builder';
import { streamMeta } from './providers/meta';
import { streamGemini } from './providers/gemini';
import { streamOpenAI } from './providers/openai';
import { streamAnthropic } from './providers/anthropic';

export async function* routeAndStreamAI(request: GenerateRequest): AsyncGenerator<string> {
  const settings = await getStoredSettings();

  const provider = request.provider || settings.provider;
  const model = request.model || settings.model;
  const apiKey = settings.apiKeys[provider]?.trim();

  if (!apiKey) {
    throw new Error(
      `No API key configured for ${provider.toUpperCase()}. Please open WriteTex Settings (⚙) and enter your API key.`
    );
  }

  const { systemPrompt, userPrompt } = buildPrompt(
    request.userPrompt,
    request.context,
    request.presetKey
  );

  let stream: AsyncGenerator<string>;

  switch (provider) {
    case 'meta':
      stream = streamMeta(apiKey, model, systemPrompt, userPrompt, request.temperature);
      break;
    case 'gemini':
      stream = streamGemini(apiKey, model, systemPrompt, userPrompt, request.temperature);
      break;
    case 'openai':
      stream = streamOpenAI(apiKey, model, systemPrompt, userPrompt, request.temperature);
      break;
    case 'anthropic':
      stream = streamAnthropic(apiKey, model, systemPrompt, userPrompt, request.temperature);
      break;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }

  let accumulated = '';

  for await (const chunk of stream) {
    accumulated += chunk;
    yield chunk;
  }
}
