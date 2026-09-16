import { parseSseStream } from './stream-parser';

/**
 * Maps model names to real, high-speed production endpoints in Google AI Studio.
 */
export function resolveGeminiModel(model: string): string {
  const clean = (model || '').replace(/^models\//, '').trim();
  if (!clean) return 'gemini-2.0-flash';

  // Map any hypothetical / versioned 3.x names directly to the official 2.0-flash (sub-second TTFT)
  if (clean.startsWith('gemini-3.') || clean === 'gemini-3.8-flash' || clean === 'gemini-3.6-flash') {
    return 'gemini-2.0-flash';
  }
  if (clean.includes('flash-lite')) {
    return 'gemini-2.0-flash-lite';
  }
  if (clean === 'gemini-2.5-flash-preview' || clean === 'gemini-2.5-flash') {
    return 'gemini-2.5-flash';
  }
  if (clean.includes('flash')) {
    return 'gemini-2.0-flash';
  }
  if (clean.includes('pro')) {
    return clean.includes('2.5') ? 'gemini-2.5-pro' : 'gemini-1.5-pro';
  }
  return clean || 'gemini-2.0-flash';
}

export async function* streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const cleanModel = resolveGeminiModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

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
      // For models supporting thinking (2.5, flash-thinking), budget 0 disables the reasoning wait
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  let response = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // If thinkingConfig is rejected by an older model (HTTP 400), gracefully retry without it
  if (!response.ok && payload.generationConfig?.thinkingConfig) {
    delete payload.generationConfig.thinkingConfig;
    response = await fetch(url, {
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
