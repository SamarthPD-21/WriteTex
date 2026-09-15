import {
  GenerateRequest,
  RuntimeMessage,
  Settings,
  StreamEvent,
  AIProviderId,
} from './types';

/**
 * Fetch settings from the service worker
 */
export async function getSettingsFromBackground(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'WRITETEX_GET_SETTINGS' } as RuntimeMessage,
      (response) => {
        if (response?.settings) {
          resolve(response.settings);
        } else {
          resolve({
            provider: 'gemini',
            apiKeys: { gemini: '', openai: '', anthropic: '' },
            model: 'gemini-2.5-pro',
            temperature: 0.2,
            contextScope: 'selection',
            autoCollapseOnApply: false,
          });
        }
      }
    );
  });
}

/**
 * Save settings via service worker
 */
export async function saveSettingsToBackground(settings: Partial<Settings>): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'WRITETEX_SAVE_SETTINGS', payload: settings } as RuntimeMessage,
      (response) => {
        resolve(response?.settings);
      }
    );
  });
}

/**
 * Validate an API key via the service worker
 */
export async function validateKeyViaBackground(
  provider: AIProviderId,
  apiKey: string
): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'WRITETEX_VALIDATE_KEY', payload: { provider, apiKey } } as RuntimeMessage,
      (response) => {
        resolve(Boolean(response?.valid));
      }
    );
  });
}

/**
 * Initiates an AI generation stream using a long-lived port.
 * Returns an unsubscribe/cancel function.
 */
export function streamGenerationFromBackground(
  request: GenerateRequest,
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void
): () => void {
  const port = chrome.runtime.connect({ name: 'WRITETEX_STREAM' });

  port.onMessage.addListener((event: StreamEvent) => {
    if (event.type === 'chunk') {
      onChunk(event.text);
    } else if (event.type === 'done') {
      onDone(event.fullText);
      port.disconnect();
    } else if (event.type === 'error') {
      onError(event.error);
      port.disconnect();
    }
  });

  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      onError(chrome.runtime.lastError.message || 'Port disconnected');
    }
  });

  // Start the generation
  port.postMessage({ type: 'START_GENERATE', request });

  return () => {
    try {
      port.postMessage({ type: 'CANCEL', requestId: request.requestId });
      port.disconnect();
    } catch {
      // Ignore
    }
  };
}
