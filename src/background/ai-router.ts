import { GenerateRequest } from '../messaging/types';
import { getStoredSettings } from './key-store';
import { buildPrompt } from '../prompts/builder';
import { streamMeta } from './providers/meta';
import { streamGemini } from './providers/gemini';
import { streamOpenAI } from './providers/openai';
import { streamAnthropic } from './providers/anthropic';
import { ProviderRequest, StreamPart } from './providers/types';

// Room for a full two-page document rewrite; only generated tokens are billed
const MAX_OUTPUT_TOKENS = 16384;

export async function* routeAndStreamAI(
  request: GenerateRequest,
  signal?: AbortSignal
): AsyncGenerator<StreamPart> {
  const settings = await getStoredSettings();

  const provider = request.provider || settings.provider;
  const model = request.model || settings.model;
  const apiKey = settings.apiKeys[provider]?.trim();

  if (!apiKey) {
    throw new Error(
      `No API key configured for ${provider.toUpperCase()}. Please open WriteTex Settings (⚙) and enter your API key.`
    );
  }

  const { systemPrompt, userPrompt } = buildPrompt(request.userPrompt, request.context, request.presetKey);

  const providerRequest: ProviderRequest = {
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    temperature: request.temperature,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    signal,
  };

  switch (provider) {
    case 'meta':
      yield* streamMeta(providerRequest);
      return;
    case 'gemini':
      yield* streamGemini(providerRequest);
      return;
    case 'openai':
      yield* streamOpenAI(providerRequest);
      return;
    case 'anthropic':
      yield* streamAnthropic(providerRequest);
      return;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
