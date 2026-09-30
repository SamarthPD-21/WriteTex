import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { AIProviderId, AVAILABLE_MODELS, Settings } from '../../messaging/types';
import { Button, Chip, inputClass } from './ui';

interface SettingsViewProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => Promise<Settings>;
  onValidateKey: (provider: AIProviderId, key: string) => Promise<boolean>;
  onBack: () => void;
  isValidating: boolean;
  /** Clears the saved target job, GitHub analysis, attachments, and history for this project. */
  onClearWorkspace: () => void;
}

const PROVIDERS: { id: AIProviderId; label: string; keyUrl: string; keyPrefix: string }[] = [
  { id: 'anthropic', label: 'Claude', keyUrl: 'https://console.anthropic.com/settings/keys', keyPrefix: 'sk-ant-…' },
  { id: 'gemini', label: 'Gemini', keyUrl: 'https://aistudio.google.com/app/apikey', keyPrefix: 'AIza…' },
  { id: 'openai', label: 'OpenAI', keyUrl: 'https://platform.openai.com/api-keys', keyPrefix: 'sk-…' },
  { id: 'meta', label: 'Meta', keyUrl: 'https://api.meta.ai', keyPrefix: 'API key' },
];

const EXTENSION_VERSION = (() => {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return '';
  }
})();

const SectionTitle: React.FC<{ step?: number; children: React.ReactNode; aside?: React.ReactNode }> = ({ step, children, aside }) => (
  <div className="flex items-center gap-2 mb-1.5">
    {step !== undefined && (
      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-200 text-[9.5px] font-bold flex items-center justify-center">{step}</span>
    )}
    <h3 className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">{children}</h3>
    {aside && <span className="ml-auto">{aside}</span>}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }> = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start gap-3 cursor-pointer">
    <span className="flex-1 min-w-0">
      <span className="block text-[11.5px] text-zinc-100">{label}</span>
      <span className="block text-[10.5px] text-zinc-500">{hint}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 w-8 h-[18px] rounded-full transition-colors shrink-0 ${checked ? 'bg-indigo-500' : 'bg-white/[0.12]'}`}
    >
      <span className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all ${checked ? 'left-[16px]' : 'left-[2px]'}`} />
    </button>
  </label>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onValidateKey,
  onBack,
  isValidating,
  onClearWorkspace,
}) => {
  const provider = settings.provider;
  const providerInfo = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const models = AVAILABLE_MODELS[provider] || [];
  const isCustomModel = !models.some((m) => m.id === settings.model);

  const [draftKey, setDraftKey] = useState(settings.apiKeys[provider] || '');
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [customModel, setCustomModel] = useState(isCustomModel ? settings.model : '');
  const [confirmClear, setConfirmClear] = useState(false);

  // Switching provider shows that provider's saved key
  useEffect(() => {
    setDraftKey(settings.apiKeys[provider] || '');
    setKeyStatus('idle');
    setShowKey(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const selectProvider = (id: AIProviderId) => {
    if (id === provider) return;
    const list = AVAILABLE_MODELS[id];
    onUpdateSettings({ provider: id, model: list.find((m) => m.recommended)?.id || list[0].id, customModelId: '' });
    setCustomModel('');
  };

  const saveKey = (value: string) => {
    setDraftKey(value);
    setKeyStatus('idle');
    onUpdateSettings({ apiKeys: { ...settings.apiKeys, [provider]: value.trim() } });
  };

  const testKey = async () => {
    if (!draftKey.trim()) return;
    setKeyStatus((await onValidateKey(provider, draftKey.trim())) ? 'valid' : 'invalid');
  };

  return (
    <div className="flex flex-col h-full min-h-0 select-text">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-line shrink-0">
        <Button size="xs" variant="ghost" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back
        </Button>
        <span className="text-[12px] font-semibold text-zinc-100">Settings</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 py-3 flex flex-col gap-5">
        {/* 1. Provider */}
        <section>
          <SectionTitle step={1}>AI provider</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="AI provider">
            {PROVIDERS.map((p) => {
              const active = p.id === provider;
              const hasKey = Boolean(settings.apiKeys[p.id]?.trim());
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectProvider(p.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors ${
                    active ? 'bg-indigo-500/15 border-indigo-400/50' : 'bg-surface-2 border-line hover:border-line-strong'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${active ? 'border-indigo-400 bg-indigo-400 shadow-[inset_0_0_0_2px_#151522]' : 'border-zinc-600'}`} />
                  <span className="text-[12px] font-semibold text-zinc-100">{p.label}</span>
                  {hasKey && (
                    <span className="ml-auto" title="API key saved">
                      <KeyRound className="w-3 h-3 text-emerald-400" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. API key */}
        <section>
          <SectionTitle
            step={2}
            aside={
              <a href={providerInfo.keyUrl} target="_blank" rel="noreferrer" className="text-[10.5px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
                Get a {providerInfo.label} key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            }
          >
            {providerInfo.label} API key
          </SectionTitle>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={draftKey}
                onChange={(e) => saveKey(e.target.value)}
                placeholder={`Paste your key (${providerInfo.keyPrefix})`}
                spellCheck={false}
                autoComplete="off"
                className={`${inputClass} font-mono pr-8 py-2`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-200"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Button
              size="sm"
              className="h-auto"
              onClick={testKey}
              disabled={isValidating || !draftKey.trim()}
              icon={
                isValidating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : keyStatus === 'valid' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : keyStatus === 'invalid' ? (
                  <CircleAlert className="w-3 h-3 text-rose-400" />
                ) : undefined
              }
            >
              {keyStatus === 'valid' ? 'Works' : keyStatus === 'invalid' ? 'Rejected' : 'Test key'}
            </Button>
          </div>
          <p className="mt-1.5 text-[10.5px] text-zinc-500 leading-snug">
            Saved as you type, unencrypted, in this browser’s extension storage, and sent only to {providerInfo.label}. Use a key with a spending limit.
          </p>
        </section>

        {/* 3. Model */}
        <section>
          <SectionTitle step={3}>Model</SectionTitle>
          <div className="flex flex-col gap-1" role="radiogroup" aria-label="Model">
            {models.map((m) => {
              const active = settings.model === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    onUpdateSettings({ model: m.id, customModelId: '' });
                    setCustomModel('');
                  }}
                  className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl border text-left transition-colors ${
                    active ? 'bg-indigo-500/15 border-indigo-400/50' : 'bg-surface-2 border-line hover:border-line-strong'
                  }`}
                >
                  <span className={`mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 ${active ? 'border-indigo-400 bg-indigo-400 shadow-[inset_0_0_0_2px_#151522]' : 'border-zinc-600'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11.5px] font-semibold text-zinc-100">{m.name}</span>
                      {m.recommended && <Chip tone="accent">Recommended</Chip>}
                      {m.badge && !m.recommended && <Chip>{m.badge}</Chip>}
                    </span>
                    {m.description && <span className="block text-[10.5px] text-zinc-400 leading-snug">{m.description}</span>}
                  </span>
                </button>
              );
            })}
            <div
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border ${isCustomModel ? 'bg-indigo-500/15 border-indigo-400/50' : 'bg-surface-2 border-line'}`}
            >
              <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${isCustomModel ? 'border-indigo-400 bg-indigo-400 shadow-[inset_0_0_0_2px_#151522]' : 'border-zinc-600'}`} />
              <input
                type="text"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  const id = e.target.value.trim();
                  if (id) onUpdateSettings({ model: id, customModelId: id });
                }}
                placeholder="Other model ID…"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent text-[11.5px] font-mono text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Behaviour */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Behaviour</SectionTitle>
          <Toggle
            checked={settings.autoCollapseOnApply}
            onChange={(v) => onUpdateSettings({ autoCollapseOnApply: v })}
            label="Close the panel after applying"
            hint="Get back to Overleaf as soon as a change lands."
          />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-100">Creativity</span>
              <span className="text-[10.5px] font-mono text-zinc-400">
                {settings.temperature <= 0.25 ? 'Precise' : settings.temperature <= 0.6 ? 'Balanced' : 'Varied'} · {settings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
              aria-label="Creativity (temperature)"
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[10.5px] text-zinc-500">Low keeps rewrites faithful to your wording. Some newer models ignore this.</p>
          </div>
        </section>

        {/* Data */}
        <section className="flex flex-col gap-2">
          <SectionTitle>This project</SectionTitle>
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[10.5px] text-zinc-500 leading-snug">
              Target job, job description, GitHub analysis, attachments, and history are saved locally for this Overleaf project.
            </p>
            {confirmClear ? (
              <span className="flex gap-1 shrink-0">
                <Button size="xs" variant="danger" onClick={() => { onClearWorkspace(); setConfirmClear(false); }}>
                  Clear
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setConfirmClear(false)}>
                  Keep
                </Button>
              </span>
            ) : (
              <Button size="xs" variant="ghost" onClick={() => setConfirmClear(true)} icon={<Trash2 className="w-3 h-3" />} className="shrink-0">
                Clear saved data
              </Button>
            )}
          </div>
        </section>

        <p className="text-center text-[10px] text-zinc-600 pb-1">WriteTex {EXTENSION_VERSION && `v${EXTENSION_VERSION}`} · No servers — requests go straight to your provider</p>
      </div>
    </div>
  );
};
