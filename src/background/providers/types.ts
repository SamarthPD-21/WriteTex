/** Why the model stopped. `truncated` output must never be applied as-is. */
export type FinishReason = 'complete' | 'truncated' | 'refused' | 'unknown';

export type StreamPart = { type: 'text'; text: string } | { type: 'finish'; reason: FinishReason };

export interface ProviderRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  signal?: AbortSignal;
}
