import { DEFAULT_SETTINGS, Settings, AIProviderId } from '../messaging/types';
import { validateMetaKey } from './providers/meta';
import { validateGeminiKey } from './providers/gemini';
import { validateOpenAIKey } from './providers/openai';
import { validateAnthropicKey } from './providers/anthropic';

const STORAGE_KEY = 'writetex_settings_v1';

export async function getStoredSettings(): Promise<Settings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data && data[STORAGE_KEY]) {
        const stored = data[STORAGE_KEY];
        // Automatically migrate deprecated or slow models to gemini-3.8-flash
        if (
          !stored.model ||
          stored.model === 'gemini-2.5-pro' ||
          stored.model === 'gemini-3.1-pro-preview' ||
          stored.model.startsWith('models/')
        ) {
          stored.model = 'gemini-3.8-flash';
          await chrome.storage.local.set({ [STORAGE_KEY]: stored });
        }

        return {
          ...DEFAULT_SETTINGS,
          ...stored,
          apiKeys: {
            ...DEFAULT_SETTINGS.apiKeys,
            ...(stored.apiKeys || {}),
          },
        };
      }
    }
  } catch (err) {
    console.error('[WriteTex] Error reading settings from chrome.storage:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveStoredSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getStoredSettings();
  const updated: Settings = {
    ...current,
    ...partial,
    apiKeys: {
      ...current.apiKeys,
      ...(partial.apiKeys || {}),
    },
  };

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    }
  } catch (err) {
    console.error('[WriteTex] Error saving settings to chrome.storage:', err);
  }

  return updated;
}

export async function validateProviderKey(
  provider: AIProviderId,
  apiKey: string
): Promise<boolean> {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  switch (provider) {
    case 'meta':
      return validateMetaKey(apiKey.trim());
    case 'gemini':
      return validateGeminiKey(apiKey.trim());
    case 'openai':
      return validateOpenAIKey(apiKey.trim());
    case 'anthropic':
      return validateAnthropicKey(apiKey.trim());
    default:
      return false;
  }
}
