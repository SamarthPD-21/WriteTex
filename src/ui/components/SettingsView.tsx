import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Settings, AIProviderId, AVAILABLE_MODELS } from '../../messaging/types';

interface SettingsViewProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => Promise<Settings>;
  onValidateKey: (provider: AIProviderId, key: string) => Promise<boolean>;
  onBack: () => void;
  isValidating: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onValidateKey,
  onBack,
  isValidating,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const activeProvider = settings.provider;
  const currentKey = settings.apiKeys[activeProvider] || '';

  const handleProviderChange = (provider: AIProviderId) => {
    const models = AVAILABLE_MODELS[provider];
    const defaultModel = models.find((m) => m.recommended)?.id || models[0].id;

    onUpdateSettings({
      provider,
      model: defaultModel,
    });
    setValidationStatus('idle');
  };

  const handleKeyChange = (newKey: string) => {
    onUpdateSettings({
      apiKeys: {
        ...settings.apiKeys,
        [activeProvider]: newKey,
      },
    });
    setValidationStatus('idle');
  };

  const handleValidate = async () => {
    if (!currentKey.trim()) return;
    const ok = await onValidateKey(activeProvider, currentKey);
    setValidationStatus(ok ? 'valid' : 'invalid');
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 select-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="font-semibold text-xs text-text-primary">Settings & AI Keys</span>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-[460px] pr-1">
        {/* 1. Provider Selection Cards */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
            AI Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['gemini', 'openai', 'anthropic'] as AIProviderId[]).map((p) => {
              const isSelected = activeProvider === p;
              const label = p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : 'Claude';
              const badge = p === 'gemini' ? 'BYOK / Free Tier' : 'BYOK';

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-150 text-center ${
                    isSelected
                      ? 'bg-accent/15 border-accent text-white shadow-sm'
                      : 'bg-bg-secondary border-border text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <span className="text-xs font-semibold capitalize">{label}</span>
                  <span className="text-[9px] text-text-muted mt-0.5">{badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. API Key Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              {activeProvider.toUpperCase()} API Key
            </label>
            <a
              href={
                activeProvider === 'gemini'
                  ? 'https://aistudio.google.com/app/apikey'
                  : activeProvider === 'openai'
                  ? 'https://platform.openai.com/api-keys'
                  : 'https://console.anthropic.com/settings/keys'
              }
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-accent hover:underline"
            >
              Get API Key ↗
            </a>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={currentKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={`Paste your ${activeProvider} API key...`}
                className="w-full px-3 py-1.5 pr-8 bg-bg-secondary border border-border rounded-lg text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !currentKey.trim()}
              className="px-2.5 py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-lg text-xs font-medium text-text-primary disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
            >
              {isValidating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              ) : validationStatus === 'valid' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : validationStatus === 'invalid' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              ) : null}
              <span>{validationStatus === 'valid' ? 'Valid' : validationStatus === 'invalid' ? 'Invalid' : 'Validate'}</span>
            </button>
          </div>
          <p className="text-[10px] text-text-muted">
            Keys are stored locally in your browser (chrome.storage.local) and never sent to our servers.
          </p>
        </div>

        {/* 3. Model Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
            Model
          </label>
          <select
            value={settings.model}
            onChange={(e) => onUpdateSettings({ model: e.target.value })}
            className="w-full px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-xs text-text-primary outline-none focus:border-accent"
          >
            {(AVAILABLE_MODELS[activeProvider] || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.badge ? `(${m.badge})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Temperature */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Temperature: <span className="font-mono text-accent">{settings.temperature}</span>
            </label>
            <span className="text-[10px] text-text-muted">
              {settings.temperature <= 0.2 ? 'Precise & Rigorous' : 'More Creative'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.temperature}
            onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-accent cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
