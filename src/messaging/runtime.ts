import {
  GenerateRequest,
  RuntimeMessage,
  Settings,
  StreamEvent,
  AIProviderId,
  DEFAULT_SETTINGS,
} from './types';
import { GitHubAnalysisResult } from '../integrations/github/types';

/**
 * Checks if the Chrome extension context is still valid.
 * When an extension is reloaded, old content scripts lose context until the tab is refreshed.
 */
export function isExtensionContextValid(): boolean {
  try {
    return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

export const CONTEXT_INVALIDATED_MSG =
  'Extension updated. Please refresh this Overleaf tab (Ctrl+R / F5) to reconnect.';

/**
 * Fetch settings from the service worker
 */
export async function getSettingsFromBackground(): Promise<Settings> {
  if (!isExtensionContextValid()) {
    return DEFAULT_SETTINGS;
  }

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
  if (!isExtensionContextValid()) {
    return DEFAULT_SETTINGS;
  }

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
  if (!isExtensionContextValid()) {
    return false;
  }

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
  if (!isExtensionContextValid()) {
    onError(CONTEXT_INVALIDATED_MSG);
    return () => {};
  }

  let port: chrome.runtime.Port | null = null;

  try {
    port = chrome.runtime.connect({ name: 'WRITETEX_STREAM' });
  } catch (err: unknown) {
    const isInvalidated =
      err instanceof Error && err.message.includes('Extension context invalidated');
    onError(isInvalidated ? CONTEXT_INVALIDATED_MSG : 'Failed to connect to background service worker');
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
      const msg = chrome.runtime.lastError.message || '';
      if (msg.includes('Extension context invalidated')) {
        onError(CONTEXT_INVALIDATED_MSG);
      } else {
        onError(msg || 'Port disconnected');
      }
    }
  });

  // Start the generation
  try {
    port.postMessage({ type: 'START_GENERATE', request });
  } catch (err: unknown) {
    const isInvalidated =
      err instanceof Error && err.message.includes('Extension context invalidated');
    onError(isInvalidated ? CONTEXT_INVALIDATED_MSG : 'Failed to send generate request to background');
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

/**
 * Analyze GitHub profile or repository via the background service worker
 */
export async function analyzeGitHubViaBackground(
  url: string,
  targetRole?: string
): Promise<GitHubAnalysisResult> {
  if (!isExtensionContextValid()) {
    throw new Error(CONTEXT_INVALIDATED_MSG);
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        {
          type: 'WRITETEX_ANALYZE_GITHUB',
          payload: { url, targetRole },
        } as RuntimeMessage,
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Failed to connect to background service worker.'));
            return;
          }
          if (response?.success && response.result) {
            resolve(response.result);
          } else {
            reject(new Error(response?.error || 'Failed to analyze GitHub link.'));
          }
        }
      );
    } catch (err: unknown) {
      reject(new Error(err instanceof Error ? err.message : String(err)));
    }
  });
}

