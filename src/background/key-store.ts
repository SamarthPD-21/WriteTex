import { DEFAULT_SETTINGS, Settings, AIProviderId } from '../messaging/types';
import { validateGeminiKey } from './providers/gemini';
import { validateOpenAIKey } from './providers/openai';
import { validateAnthropicKey } from './providers/anthropic';

const STORAGE_KEY = 'writetex_settings_v1';

export async function getStoredSettings(): Promise<Settings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data && data[STORAGE_KEY]) {
        return {
          ...DEFAULT_SETTINGS,
          ...data[STORAGE_KEY],
          apiKeys: {
            ...DEFAULT_SETTINGS.apiKeys,
            ...(data[STORAGE_KEY].apiKeys || {}),
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
