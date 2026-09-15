import { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_SETTINGS,
  Settings,
  AIProviderId,
} from '../../messaging/types';
import {
  getSettingsFromBackground,
  saveSettingsToBackground,
  validateKeyViaBackground,
} from '../../messaging/runtime';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    getSettingsFromBackground().then((loaded) => {
      if (mounted) {
        setSettings(loaded);
        setIsLoading(false);
      }
    });

    // Listen for storage changes across instances
    const storageListener = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes['writetex_settings_v1']) {
        setSettings(changes['writetex_settings_v1'].newValue);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
    }

    return () => {
      mounted = false;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
    };
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
      apiKeys: {
        ...prev.apiKeys,
        ...(partial.apiKeys || {}),
      },
    }));
    return saveSettingsToBackground(partial);
  }, []);

  const validateKey = useCallback(
    async (provider: AIProviderId, apiKey: string): Promise<boolean> => {
      setIsValidating(true);
      try {
        const result = await validateKeyViaBackground(provider, apiKey);
        return result;
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  return {
    settings,
    isLoading,
    isValidating,
    updateSettings,
    validateKey,
  };
}
