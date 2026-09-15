import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, FileText, Zap } from 'lucide-react';
import { PRESET_PROMPTS } from '../../prompts/presets';
import { ModelSelector } from './ModelSelector';
import { Settings } from '../../messaging/types';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';

interface ChatInputProps {
  selectedText: string;
  currentFileName: string;
  settings: Settings;
  onUpdateModel: (model: string) => void;
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
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = prompt.trim();
    if (!query && !activePreset) return;

    const finalPrompt = query || (PRESET_PROMPTS.find((p) => p.id === activePreset)?.userPrompt ?? '');
    onGenerate(finalPrompt, activePreset || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectPreset = (presetId: string) => {
    if (activePreset === presetId) {
      setActivePreset(null);
      setPrompt('');
    } else {
      setActivePreset(presetId);
      const preset = PRESET_PROMPTS.find((p) => p.id === presetId);
      if (preset) {
        setPrompt(preset.userPrompt);
      }
    }
  };

  const hasApiKey = Boolean(settings.apiKeys[settings.provider]?.trim());

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* 1. Context Badge */}
      <div className="flex items-center justify-between text-xs bg-bg-secondary/70 border border-border-subtle px-3 py-1.5 rounded-lg">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-mono text-text-primary text-[11px] truncate">{currentFileName}</span>
        </div>

        {selectedText && selectedText.trim().length > 0 ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] text-text-secondary">
              Selection: <span className="font-mono font-medium text-text-primary">{selectedText.length}</span> chars
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-text-muted italic">No selection (target: current line)</span>
        )}
      </div>

      {/* API Key Alert if missing */}
      {!hasApiKey && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Missing {settings.provider.toUpperCase()} API key</span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-[11px] transition-colors"
          >
            Configure
          </button>
        </div>
      )}

      {/* 2. Text Input Area */}
      <div className="relative flex flex-col rounded-xl bg-bg-secondary border border-border focus-within:border-accent transition-colors duration-150 shadow-inner">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (activePreset) setActivePreset(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedText
              ? 'Ask WriteTex to rewrite, fix, or improve this selection...'
              : 'Ask WriteTex anything about your document or LaTeX code...'
          }
          rows={2}
          disabled={isGenerating}
          className="w-full px-3.5 pt-3 pb-2 bg-transparent text-text-primary placeholder:text-text-muted text-xs resize-none outline-none leading-relaxed"
        />

        {/* 3. Preset Quick Actions Row */}
        <div className="px-2.5 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {PRESET_PROMPTS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                title={preset.description}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150 select-none ${
                  isSelected
                    ? 'bg-accent text-white shadow-sm scale-[1.02]'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Toolbar */}
      <div className="flex items-center justify-between pt-1">
        <ModelSelector
          provider={settings.provider}
          selectedModel={settings.model}
          onSelectModel={onUpdateModel}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isGenerating || (!prompt.trim() && !activePreset) || !hasApiKey}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all duration-150 active:scale-95"
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
