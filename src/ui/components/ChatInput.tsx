import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Mail,
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
  Target,
  ChevronDown,
  ChevronUp,
  Layers,
  Sliders,
  Building2,
} from 'lucide-react';
import {
  BasePreset,
  RESUME_ROLE_PRESETS,
  RESUME_ACTION_PRESETS,
  COVER_LETTER_SECTION_PRESETS,
  COVER_LETTER_TONE_PRESETS,
} from '../../prompts/presets';
import { ModelSelector } from './ModelSelector';
import { Settings, AIProviderId, DocumentMode } from '../../messaging/types';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';
import { DiffResult } from '../../diff/types';

export interface HistoryItem {
  id: string;
  userPrompt: string;
  docMode?: DocumentMode;
  targetRole?: string;
  targetCompany?: string;
  response: string;
  diffResult?: DiffResult | null;
  timestamp: number;
}

interface ChatInputProps {
  selectedText: string;
  currentFileName: string;
  settings: Settings;
  onUpdateModel: (provider: AIProviderId, model: string) => void;
  onGenerate: (
    prompt: string,
    presetKey?: string,
    meta?: {
      docMode: DocumentMode;
      targetCompany?: string;
      targetRole?: string;
      jobDescription?: string;
    }
  ) => void;
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
  // Document mode: 'resume' vs 'cover_letter'
  const [docMode, setDocMode] = useState<DocumentMode>('resume');

  // Target details
  const [targetCompany, setTargetCompany] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isTargetExpanded, setIsTargetExpanded] = useState<boolean>(false);
  const [showJdInput, setShowJdInput] = useState<boolean>(false);

  // Prompt and preset state
  const [prompt, setPrompt] = useState<string>('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Sub-tabs:
  // For resume: 'roles' | 'actions'
  // For cover letter: 'sections' | 'tones'
  const [resumeTab, setResumeTab] = useState<'roles' | 'actions'>('roles');
  const [clTab, setClTab] = useState<'sections' | 'tones'>('sections');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Auto-detect document mode from filename if set
  useEffect(() => {
    const lower = (currentFileName || '').toLowerCase();
    if (lower.includes('cover') || lower.includes('letter')) {
      setDocMode('cover_letter');
    } else if (lower.includes('resume') || lower.includes('cv')) {
      setDocMode('resume');
    }
  }, [currentFileName]);

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

  const getCurrentPresets = (): BasePreset[] => {
    if (docMode === 'resume') {
      return resumeTab === 'roles' ? RESUME_ROLE_PRESETS : RESUME_ACTION_PRESETS;
    }
    return clTab === 'sections' ? COVER_LETTER_SECTION_PRESETS : COVER_LETTER_TONE_PRESETS;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = prompt.trim();
    const allPresets: BasePreset[] =
      docMode === 'resume'
        ? [...RESUME_ROLE_PRESETS, ...RESUME_ACTION_PRESETS]
        : [...COVER_LETTER_SECTION_PRESETS, ...COVER_LETTER_TONE_PRESETS];

    const activePreset = allPresets.find((p) => p.id === activePresetId);
    if (!query && !activePreset) return;

    let finalPrompt = query || (activePreset?.userPrompt ?? '');

    // In cover letter mode, if target company/role is given but not already in prompt, augment smoothly
    if (targetCompany && !finalPrompt.includes(targetCompany)) {
      finalPrompt = `[Target Company: ${targetCompany}] ${finalPrompt}`;
    }
    if (targetRole && !finalPrompt.includes(targetRole)) {
      finalPrompt = `[Target Role: ${targetRole}] ${finalPrompt}`;
    }

    onGenerate(finalPrompt, activePresetId || undefined, {
      docMode,
      targetCompany: targetCompany.trim() || undefined,
      targetRole: targetRole.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
    });

    setPrompt('');
    setActivePresetId(null);
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

  const handleSelectPreset = (preset: BasePreset) => {
    if (activePresetId === preset.id) {
      setActivePresetId(null);
      setPrompt('');
    } else {
      setActivePresetId(preset.id);
      setPrompt(preset.userPrompt);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasApiKey = Boolean(settings.apiKeys[settings.provider]?.trim());
  const hasTarget = Boolean(targetCompany.trim() || targetRole.trim());

  const currentPresets = getCurrentPresets();

  const getPlaceholderText = () => {
    if (docMode === 'resume') {
      if (selectedText && selectedText.trim().length > 0) {
        return 'Specify target role or polish instruction (e.g. "Tailor for Senior Staff at Stripe", "Add metrics")...';
      }
      return 'Select LaTeX resume bullet points, or pick a target role below...';
    }
    // Cover letter mode
    if (selectedText && selectedText.trim().length > 0) {
      return 'Draft or synthesize selected resume experience into a cover letter...';
    }
    return 'Draft a tailored cover letter for your target role & company...';
  };

  return (
    <div className="flex flex-col gap-2.5 p-3.5 select-none max-h-[580px]">
      {/* 1. Document Mode Switcher (Resume vs Cover Letter) */}
      <div className="flex items-center gap-1.5 p-1 bg-[#13131e] rounded-xl border border-border/70 shrink-0">
        <button
          type="button"
          onClick={() => {
            setDocMode('resume');
            setActivePresetId(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            docMode === 'resume'
              ? 'bg-accent text-white shadow-sm scale-[1.01]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>📄 Resume / CV</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDocMode('cover_letter');
            setActivePresetId(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            docMode === 'cover_letter'
              ? 'bg-accent text-white shadow-sm scale-[1.01]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>✉️ Cover Letter</span>
        </button>
      </div>

      {/* 2. Context Badge & Target Position Bar */}
      <div className="flex flex-col gap-1.5 bg-[#161622] border border-border/60 p-2.5 rounded-xl shadow-inner shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
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
            <span className="text-[10.5px] text-text-muted italic">
              {docMode === 'resume' ? 'Select bullets to tailor' : 'Select resume items to draft'}
            </span>
          )}
        </div>

        {/* Target Position Pill / Expand Button */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-xs">
          {hasTarget ? (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-amber-400 text-[11px] shrink-0 font-medium">🎯 Target:</span>
              <span className="text-text-primary font-semibold text-[11px] truncate">
                {targetCompany && `${targetCompany}`}
                {targetCompany && targetRole && ' · '}
                {targetRole && `${targetRole}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTargetCompany('');
                  setTargetRole('');
                  setJobDescription('');
                }}
                className="p-0.5 rounded hover:bg-white/10 text-text-muted hover:text-text-primary shrink-0"
                title="Clear target"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsTargetExpanded(!isTargetExpanded)}
              className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent font-medium transition-colors"
            >
              <Target className="w-3 h-3 text-accent shrink-0" />
              <span>Target Company & Role (e.g. Stripe · Senior SWE)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTargetExpanded(!isTargetExpanded)}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors shrink-0 ml-1"
          >
            <span>{isTargetExpanded ? 'Hide' : 'Edit'}</span>
            {isTargetExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expandable Target Details Drawer */}
        {isTargetExpanded && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle/60 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="Company (e.g. Stripe, Google)"
                className="px-2.5 py-1.5 bg-[#0f0f18] border border-border/70 rounded-lg text-[11px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Role (e.g. Senior Software Eng)"
                className="px-2.5 py-1.5 bg-[#0f0f18] border border-border/70 rounded-lg text-[11px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowJdInput(!showJdInput)}
                className="text-[10.5px] text-accent hover:underline flex items-center gap-1"
              >
                <span>{showJdInput ? '− Hide Job Description' : '+ Add Job Description / Requirements'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTargetExpanded(false)}
                className="px-2 py-0.5 rounded text-[10.5px] bg-accent/20 hover:bg-accent/30 text-accent font-medium"
              >
                Done
              </button>
            </div>

            {showJdInput && (
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste key requirements or job description snippet here..."
                rows={2}
                className="w-full px-2.5 py-1.5 bg-[#0f0f18] border border-border/70 rounded-lg text-[11px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent resize-none leading-relaxed"
              />
            )}
          </div>
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

      {/* 3. Scrollable Past Requests / History Thread */}
      {history.length > 0 && (
        <div
          ref={historyContainerRef}
          className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar border-b border-border-subtle/70 pb-2"
        >
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
                <div className="flex items-center gap-1.5 truncate flex-1">
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/10 text-text-muted font-medium shrink-0">
                    {item.docMode === 'cover_letter' ? '✉️ Cover' : '📄 Resume'}
                  </span>
                  <span className="font-semibold text-text-primary text-[11px] truncate">
                    {item.userPrompt}
                  </span>
                </div>
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

      {/* 4. Text Input Box */}
      <div className="relative flex flex-col rounded-xl bg-[#14141e] border border-border/70 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40 transition-all duration-150 shadow-inner shrink-0">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (activePresetId) setActivePresetId(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            rows={2}
            disabled={isGenerating}
            className="w-full px-3.5 pt-2.5 pb-2 pr-8 bg-transparent text-text-primary placeholder:text-text-muted text-xs resize-none outline-none leading-relaxed select-text"
          />

          {prompt && (
            <button
              type="button"
              onClick={() => {
                setPrompt('');
                setActivePresetId(null);
              }}
              title="Clear input"
              className="absolute right-2 top-2.5 p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Specialized Presets Row */}
      <div className="flex flex-col gap-1.5 pt-0.5 shrink-0">
        <div className="flex items-center justify-between px-0.5">
          {docMode === 'resume' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setResumeTab('roles')}
                className={`text-[10.5px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors ${
                  resumeTab === 'roles' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span>Target Role</span>
              </button>
              <span className="text-text-muted text-[10px]">·</span>
              <button
                type="button"
                onClick={() => setResumeTab('actions')}
                className={`text-[10.5px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors ${
                  resumeTab === 'actions' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Wand2 className="w-3 h-3" />
                <span>Resume Polish</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setClTab('sections')}
                className={`text-[10.5px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors ${
                  clTab === 'sections' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Drafting & Sections</span>
              </button>
              <span className="text-text-muted text-[10px]">·</span>
              <button
                type="button"
                onClick={() => setClTab('tones')}
                className={`text-[10.5px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors ${
                  clTab === 'tones' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Letter Tone</span>
              </button>
            </div>
          )}

          <span className="text-[9.5px] text-text-muted">Click to auto-tailor</span>
        </div>

        {/* Horizontal Scrollable Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {currentPresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
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

      {/* 6. Bottom Toolbar */}
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
              disabled={(!prompt.trim() && !activePresetId) || !hasApiKey}
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

