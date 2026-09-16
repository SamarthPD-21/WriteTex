import { parseSseStream } from './stream-parser';

/**
 * Normalizes model names for Google AI Studio API.
 */
export function resolveGeminiModel(model: string): string {
  const clean = (model || '').replace(/^models\//, '').trim();
  if (!clean) return 'gemini-3.8-flash';
  return clean;
}

export async function* streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const targetModel = resolveGeminiModel(model);

  const makeUrl = (m: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // High-speed generation config: disable thinking overhead for sub-second responses
  const payload: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  let response = await fetch(makeUrl(targetModel), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // If thinkingConfig is rejected by the model (HTTP 400), gracefully retry without it
  if (!response.ok && payload.generationConfig?.thinkingConfig) {
    delete payload.generationConfig.thinkingConfig;
    response = await fetch(makeUrl(targetModel), {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  // If the model endpoint is 404 (not accessible on user's API key tier), fallback to gemini-2.0-flash
  if (!response.ok && response.status === 404 && targetModel !== 'gemini-2.0-flash') {
    response = await fetch(makeUrl('gemini-2.0-flash'), {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    let errMsg = `Gemini API error: HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.error?.message) {
        errMsg = errorJson.error.message;
      }
    } catch {
      // Ignore
    }
    throw new Error(errMsg);
  }

  yield* parseSseStream(
    response,
    (data) => {
      const parts = data.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts) || parts.length === 0) return undefined;

      // Extract real text deltas, skipping any internal thinking blocks
      const textTokens = parts
        .filter((p: any) => !p.thought && typeof p.text === 'string')
        .map((p: any) => p.text);

      if (textTokens.length > 0) {
        return textTokens.join('');
      }

      // Fallback
      return parts[0]?.text;
    },
    signal
  );
}

export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    return res.ok;
  } catch {
    return false;
  }
}
