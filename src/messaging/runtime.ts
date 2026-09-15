import {
  GenerateRequest,
  RuntimeMessage,
  Settings,
  StreamEvent,
  AIProviderId,
  DEFAULT_SETTINGS,
} from './types';

/**
 * Fetch settings from the service worker
 */
export async function getSettingsFromBackground(): Promise<Settings> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'WRITETEX_GET_SETTINGS' } as RuntimeMessage,
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(DEFAULT_SETTINGS);
            return;
          }
          if (response?.settings) {
            resolve(response.settings);
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        }
      );
    } catch {
      resolve(DEFAULT_SETTINGS);
    }
  });
}

/**
 * Save settings via service worker
 */
export async function saveSettingsToBackground(settings: Partial<Settings>): Promise<Settings> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'WRITETEX_SAVE_SETTINGS', payload: settings } as RuntimeMessage,
        (response) => {
          if (chrome.runtime.lastError) {
            // Ignore error
          }
          resolve(response?.settings || DEFAULT_SETTINGS);
        }
      );
    } catch {
      resolve(DEFAULT_SETTINGS);
    }
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
    try {
      chrome.runtime.sendMessage(
        { type: 'WRITETEX_VALIDATE_KEY', payload: { provider, apiKey } } as RuntimeMessage,
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(Boolean(response?.valid));
        }
      );
    } catch {
      resolve(false);
    }
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
  let port: chrome.runtime.Port | null = null;

  try {
    port = chrome.runtime.connect({ name: 'WRITETEX_STREAM' });
  } catch (err: unknown) {
    onError(err instanceof Error ? err.message : 'Failed to connect to background service worker');
    return () => {};
  }

  port.onMessage.addListener((event: StreamEvent) => {
    if (event.type === 'chunk') {
      onChunk(event.text);
    } else if (event.type === 'done') {
      onDone(event.fullText);
      try {
        port?.disconnect();
      } catch {
        // Ignore
      }
    } else if (event.type === 'error') {
      onError(event.error);
      try {
        port?.disconnect();
      } catch {
        // Ignore
      }
    }
  });

  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      onError(chrome.runtime.lastError.message || 'Port disconnected');
    }
  });

  // Start the generation
  try {
    port.postMessage({ type: 'START_GENERATE', request });
  } catch (err: unknown) {
    onError(err instanceof Error ? err.message : 'Failed to send generate request to background');
  }

  return () => {
    try {
      if (port) {
        port.postMessage({ type: 'CANCEL', requestId: request.requestId });
        port.disconnect();
      }
    } catch {
      // Ignore
    }
  };
}
