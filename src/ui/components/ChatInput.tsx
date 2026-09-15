import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Zap,
  X,
  Briefcase,
  Wand2,
  Clock,
  Copy,
  Check,
  GitCompare,
  ArrowUpRight,
  Square,
} from 'lucide-react';
import { ROLE_PRESETS, RolePreset } from '../../prompts/presets';
import { ModelSelector } from './ModelSelector';
import { Settings, AIProviderId } from '../../messaging/types';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';
import { DiffResult } from '../../diff/types';

export interface HistoryItem {
  id: string;
  userPrompt: string;
  targetRole?: string;
  response: string;
  diffResult?: DiffResult | null;
  timestamp: number;
}

interface ChatInputProps {
  selectedText: string;
  currentFileName: string;
  settings: Settings;
  onUpdateModel: (provider: AIProviderId, model: string) => void;
  onGenerate: (prompt: string, presetKey?: string) => void;
  isGenerating: boolean;
  onStop?: () => void;
  onOpenSettings: () => void;
  history?: HistoryItem[];
  onViewDiff?: (diff: DiffResult) => void;
  onApplyDirect?: (text: string) => void;
  onClearHistory?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  selectedText,
  currentFileName,
  settings,
  onUpdateModel,
  onGenerate,
  isGenerating,
  onStop,
  onOpenSettings,
  history = [],
  onViewDiff,
  onApplyDirect,
  onClearHistory,
}) => {
  const [prompt, setPrompt] = useState('');
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'actions'>('roles');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  // Scroll to bottom of history on new message
  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
    }
  }, [history.length]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = prompt.trim();
    if (!query && !activeRole) return;

    const finalPrompt = query || (ROLE_PRESETS.find((p) => p.id === activeRole)?.userPrompt ?? '');
    onGenerate(finalPrompt, activeRole || undefined);
    setPrompt('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Arrow up to recall past prompt
    if (e.key === 'ArrowUp' && (prompt === '' || historyIndex !== -1) && history.length > 0) {
      e.preventDefault();
      const nextIdx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIdx);
      const past = history[history.length - 1 - nextIdx];
      if (past) {
        setPrompt(past.userPrompt);
      }
    } else if (e.key === 'ArrowDown' && historyIndex > -1) {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      if (nextIdx === -1) {
        setPrompt('');
      } else {
        const past = history[history.length - 1 - nextIdx];
        if (past) {
          setPrompt(past.userPrompt);
        }
      }
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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasApiKey = Boolean(settings.apiKeys[settings.provider]?.trim());

  const rolePresets = ROLE_PRESETS.filter((p) => p.category === 'role');
  const actionPresets = ROLE_PRESETS.filter((p) => p.category === 'action');

  return (
    <div className="flex flex-col gap-2.5 p-3.5 select-none max-h-[560px]">
      {/* 1. Context Badge */}
      <div className="flex items-center justify-between text-xs bg-[#161622] border border-border/60 px-3 py-1.5 rounded-xl shadow-inner shrink-0">
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
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 shrink-0">
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

      {/* 2. Scrollable Past Requests / History Thread */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[175px] overflow-y-auto pr-1 no-scrollbar border-b border-border-subtle/70 pb-2">
          <div className="flex items-center justify-between px-1 text-[10px] text-text-muted font-semibold uppercase tracking-wider sticky top-0 bg-[#171724]/95 backdrop-blur-sm z-10 py-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Past Requests ({history.length})
            </span>
            {onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="hover:text-text-primary text-[9.5px] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {history.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#13131f] border border-border/70 text-xs"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-text-primary text-[11px] truncate flex-1">
                  {item.userPrompt}
                </span>
                <span className="text-[9px] font-mono text-text-muted shrink-0">
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="font-mono text-[10.5px] text-text-secondary bg-[#0e0e16] p-2 rounded-lg line-clamp-3 select-text whitespace-pre-wrap">
                {item.response}
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setPrompt(item.userPrompt)}
                  className="px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center gap-1"
                >
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  <span>Reuse</span>
                </button>

                {item.diffResult && onViewDiff && (
                  <button
                    type="button"
                    onClick={() => onViewDiff(item.diffResult!)}
                    className="px-2 py-0.5 rounded text-[10px] bg-accent/20 hover:bg-accent/30 text-accent font-medium flex items-center gap-1"
                  >
                    <GitCompare className="w-2.5 h-2.5" />
                    <span>Diff</span>
                  </button>
                )}

                {onApplyDirect && (
                  <button
                    type="button"
                    onClick={() => onApplyDirect(item.response)}
                    className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-medium border border-emerald-800/40"
                  >
                    Apply
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.response)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-text-muted hover:text-white"
                  title="Copy to clipboard"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Text Input Box */}
      <div className="relative flex flex-col rounded-xl bg-[#14141e] border border-border/70 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40 transition-all duration-150 shadow-inner shrink-0">
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

      {/* 4. Role Switcher & Resume Builder Pills */}
      <div className="flex flex-col gap-1.5 pt-0.5 shrink-0">
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

      {/* 5. Bottom Toolbar */}
      <div className="flex items-center justify-between pt-1 gap-2 border-t border-border-subtle/60 shrink-0">
        <ModelSelector selectedModel={settings.model} onSelectModel={onUpdateModel} />

        <div className="flex items-center gap-2">
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-red-200 bg-red-950/60 hover:bg-red-900 border border-red-800/60 shadow-md transition-all duration-150 active:scale-95 animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={(!prompt.trim() && !activeRole) || !hasApiKey}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-accent to-[#8f71ff] hover:from-[#6c48f8] hover:to-[#7f5eff] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all duration-150 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate</span>
              <KeyboardShortcutHint
                shortcut="Ctrl+Enter"
                className="ml-1 opacity-75 hidden sm:inline-flex"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
