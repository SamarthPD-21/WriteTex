import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, AlertCircle, Loader2, Sparkles, ExternalLink, Zap } from 'lucide-react';
import { Settings, AIProviderId, AVAILABLE_MODELS } from '../../messaging/types';

interface SettingsViewProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => Promise<Settings>;
  onValidateKey: (provider: AIProviderId, key: string) => Promise<boolean>;
  onBack: () => void;
  isValidating: boolean;
}

const PROVIDER_CONFIGS: Record<
  AIProviderId,
  { label: string; sub: string; keyUrl: string; keyPlaceholder: string; hint: string }
> = {
  meta: {
    label: 'Meta AI',
    sub: 'Spark 1.2 & 1.3',
    keyUrl: 'https://api.meta.ai',
    keyPlaceholder: 'Paste your Meta Model API key...',
    hint: 'Powers Meta Spark 1.2 and 1.3 with 1M context and agentic reasoning.',
  },
  gemini: {
    label: 'Gemini',
    sub: '3.1 Pro & 2.0',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'Paste your Google AI Studio API key...',
    hint: 'Official Gemini 3.1 Pro Preview and Gemini 2.0 Flash / Flash Lite.',
  },
  openai: {
    label: 'OpenAI',
    sub: 'GPT-4o & o3',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'Paste your OpenAI API key (sk-...)...',
    hint: 'Flagship GPT-4o and o3-mini STEM reasoning models.',
  },
  anthropic: {
    label: 'Claude',
    sub: 'Sonnet 3.7 & Haiku',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'Paste your Anthropic API key (sk-ant-...)...',
    hint: 'Claude 3.7 Sonnet hybrid reasoning and Claude 3.5 Haiku efficiency.',
  },
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onValidateKey,
  onBack,
  isValidating,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [useCustomModel, setUseCustomModel] = useState(Boolean(settings.customModelId));

  const activeProvider = settings.provider;
  const currentKey = settings.apiKeys[activeProvider] || '';
  const providerInfo = PROVIDER_CONFIGS[activeProvider];

  const handleProviderChange = (provider: AIProviderId) => {
    const models = AVAILABLE_MODELS[provider];
    const defaultModel = models.find((m) => m.recommended)?.id || models[0].id;

    onUpdateSettings({
      provider,
      model: defaultModel,
      customModelId: '',
    });
    setUseCustomModel(false);
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
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold text-xs text-text-primary">Settings & Models</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-[460px] pr-1 no-scrollbar">
        {/* 1. Provider Selection Cards */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider">
            AI Provider
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['meta', 'gemini', 'openai', 'anthropic'] as AIProviderId[]).map((p) => {
              const isSelected = activeProvider === p;
              const config = PROVIDER_CONFIGS[p];

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-150 text-center ${
                    isSelected
                      ? 'bg-accent/20 border-accent text-white shadow-sm ring-1 ring-accent/40'
                      : 'bg-[#14141e] border-border/70 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <span className="text-[11.5px] font-bold tracking-tight">{config.label}</span>
                  <span className="text-[8.5px] text-text-muted mt-0.5 font-mono leading-none truncate max-w-full">
                    {config.sub}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5 leading-snug">{providerInfo.hint}</p>
        </div>

        {/* 2. API Key Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider">
              {providerInfo.label} API Key
            </label>
            <a
              href={providerInfo.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-accent hover:text-accent-light flex items-center gap-1 hover:underline"
            >
              <span>Get Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={currentKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={providerInfo.keyPlaceholder}
                className="w-full px-3 py-1.5 pr-8 bg-[#14141e] border border-border/80 focus:border-accent rounded-xl text-xs font-mono text-text-primary placeholder:text-text-muted outline-none transition-colors"
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
              className="px-2.5 py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-xl text-xs font-medium text-text-primary disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
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
            Keys are encrypted locally in your browser storage (<code className="text-text-secondary">chrome.storage.local</code>). Direct browser-to-API calls only.
          </p>
        </div>

        {/* 3. Model Selection */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider">
              Selected Model
            </label>
            <button
              type="button"
              onClick={() => {
                const next = !useCustomModel;
                setUseCustomModel(next);
                if (!next) onUpdateSettings({ customModelId: '' });
              }}
              className="text-[10px] text-accent hover:underline"
            >
              {useCustomModel ? 'Choose from list' : 'Custom model ID'}
            </button>
          </div>

          {useCustomModel ? (
            <input
              type="text"
              value={settings.customModelId || settings.model}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateSettings({ model: val, customModelId: val });
              }}
              placeholder="e.g. muse-spark-1.3 or gemini-3.1-pro-preview"
              className="w-full px-3 py-1.5 bg-[#14141e] border border-border/80 focus:border-accent rounded-xl text-xs font-mono text-text-primary outline-none"
            />
          ) : (
            <select
              value={settings.model}
              onChange={(e) => onUpdateSettings({ model: e.target.value })}
              className="w-full px-3 py-2 bg-[#14141e] border border-border/80 rounded-xl text-xs text-text-primary outline-none focus:border-accent cursor-pointer"
            >
              {(AVAILABLE_MODELS[activeProvider] || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.badge ? `[${m.badge}]` : ''} — {m.description?.slice(0, 45)}...
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 4. Temperature */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider">
              Temperature: <span className="font-mono text-accent font-bold">{settings.temperature}</span>
            </label>
            <span className="text-[10px] text-text-muted">
              {settings.temperature <= 0.2 ? 'Deterministic & Rigorous' : 'More Creative'}
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

        {/* 5. Quick Reset to Latest Fast Model */}
        <div className="pt-1 border-t border-border-subtle/70">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                provider: 'gemini',
                model: 'gemini-2.0-flash',
                customModelId: '',
              })
            }
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 transition-all shadow-sm active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Switch to Gemini 2.0 Flash (Fastest · Sub-second)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
