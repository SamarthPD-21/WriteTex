import { parseSseStream } from './stream-parser';

export async function* streamAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): AsyncGenerator<string> {
  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
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
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = `Anthropic API error: HTTP ${response.status}`;
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
    // Anthropic emits content_block_delta with delta.text
    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
      return data.delta.text;
    }
    return data.delta?.text;
  });
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    // 200 or even 400 with invalid parameters indicates valid authentication
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}
