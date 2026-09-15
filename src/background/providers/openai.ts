import { parseSseStream } from './stream-parser';

export async function* streamOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): AsyncGenerator<string> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');

  const messages = isReasoningModel
    ? [
        {
          role: 'user',
          content: `${systemPrompt}\n\n${userPrompt}`,
        },
      ]
    : [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ];

  const payload: Record<string, any> = {
    model,
    messages,
    stream: true,
  };

  if (!isReasoningModel) {
    payload.temperature = temperature;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = `OpenAI API error: HTTP ${response.status}`;
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

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
