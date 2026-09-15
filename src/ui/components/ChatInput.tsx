import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, FileText, Zap, X, Briefcase, Wand2 } from 'lucide-react';
import { ROLE_PRESETS, RolePreset } from '../../prompts/presets';
import { ModelSelector } from './ModelSelector';
import { Settings, AIProviderId } from '../../messaging/types';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';

interface ChatInputProps {
  selectedText: string;
  currentFileName: string;
  settings: Settings;
  onUpdateModel: (provider: AIProviderId, model: string) => void;
  onGenerate: (prompt: string, presetKey?: string) => void;
  isGenerating: boolean;
  onOpenSettings: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  selectedText,
  currentFileName,
  settings,
  onUpdateModel,
  onGenerate,
  isGenerating,
  onOpenSettings,
}) => {
  const [prompt, setPrompt] = useState('');
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'actions'>('roles');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = prompt.trim();
    if (!query && !activeRole) return;

    const finalPrompt = query || (ROLE_PRESETS.find((p) => p.id === activeRole)?.userPrompt ?? '');
    onGenerate(finalPrompt, activeRole || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectPreset = (preset: RolePreset) => {
    if (activeRole === preset.id) {
      setActiveRole(null);
      setPrompt('');
    } else {
      setActiveRole(preset.id);
      setPrompt(preset.userPrompt);
    }
  };

  const hasApiKey = Boolean(settings.apiKeys[settings.provider]?.trim());

  const rolePresets = ROLE_PRESETS.filter((p) => p.category === 'role');
  const actionPresets = ROLE_PRESETS.filter((p) => p.category === 'action');

  return (
    <div className="flex flex-col gap-2.5 p-3.5 select-none">
      {/* 1. Context Badge */}
      <div className="flex items-center justify-between text-xs bg-[#161622] border border-border/60 px-3 py-1.5 rounded-xl shadow-inner">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-mono text-text-primary text-[11px] truncate font-medium">
            {currentFileName}
          </span>
        </div>

        {selectedText && selectedText.trim().length > 0 ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] text-text-secondary">
              Selected: <span className="font-mono font-semibold text-emerald-300">{selectedText.length}</span> chars
            </span>
          </div>
        ) : (
          <span className="text-[10.5px] text-text-muted italic">Highlight bullet points to tailor</span>
        )}
      </div>

      {/* API Key Alert if missing */}
      {!hasApiKey && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Missing {settings.provider.toUpperCase()} API key</span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-[11px] transition-colors shadow-sm active:scale-95"
          >
            Configure
          </button>
        </div>
      )}

      {/* 2. Text Input Box */}
      <div className="relative flex flex-col rounded-xl bg-[#14141e] border border-border/70 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40 transition-all duration-150 shadow-inner">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (activeRole) setActiveRole(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedText
                ? 'Specify target role or instructions (e.g. "Tailor for Senior Staff at Stripe", "Add metrics")...'
                : 'Select LaTeX resume bullet points, or type custom instructions...'
            }
            rows={2}
            disabled={isGenerating}
            className="w-full px-3.5 pt-2.5 pb-2 pr-8 bg-transparent text-text-primary placeholder:text-text-muted text-xs resize-none outline-none leading-relaxed select-text"
          />

          {prompt && (
            <button
              type="button"
              onClick={() => {
                setPrompt('');
                setActiveRole(null);
              }}
              title="Clear input"
              className="absolute right-2 top-2.5 p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Role Switcher & Resume Builder Pills */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`text-[10.5px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors ${
                activeTab === 'roles' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Briefcase className="w-3 h-3" />
              <span>Target Role</span>
            </button>
            <span className="text-text-muted text-[10px]">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('actions')}
              className={`text-[10.5px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors ${
                activeTab === 'actions' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Wand2 className="w-3 h-3" />
              <span>Resume Polish</span>
            </button>
          </div>

          <span className="text-[9.5px] text-text-muted">Click to auto-tailor</span>
        </div>

        {/* Horizontal Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(activeTab === 'roles' ? rolePresets : actionPresets).map((preset) => {
            const isSelected = activeRole === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                title={preset.description}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-150 select-none flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-accent border-accent text-white shadow-sm scale-[1.02]'
                    : 'bg-[#181826] border-border/60 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border'
                }`}
              >
                {preset.icon && <span className="text-[11px]">{preset.icon}</span>}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Toolbar */}
      <div className="flex items-center justify-between pt-1 gap-2 border-t border-border-subtle/60">
        <ModelSelector
          selectedModel={settings.model}
          onSelectModel={onUpdateModel}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isGenerating || (!prompt.trim() && !activeRole) || !hasApiKey}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-accent to-[#8f71ff] hover:from-[#6c48f8] hover:to-[#7f5eff] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all duration-150 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate</span>
            <KeyboardShortcutHint shortcut="Ctrl+Enter" className="ml-1 opacity-75 hidden sm:inline-flex" />
          </button>
        </div>
      </div>
    </div>
  );
};
