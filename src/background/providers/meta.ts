import { parseSseStream } from './stream-parser';

export async function* streamMeta(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): AsyncGenerator<string> {
  const url = 'https://api.meta.ai/v1/chat/completions';

  const payload: Record<string, any> = {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    temperature,
    stream: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = `Meta Model API error: HTTP ${response.status}`;
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

  yield* parseSseStream(response, (data) => {
    return data.choices?.[0]?.delta?.content;
  });
}

export async function validateMetaKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.meta.ai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
