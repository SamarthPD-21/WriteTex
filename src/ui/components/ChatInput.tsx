import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Star,
  ExternalLink,
  Loader2,
  Code2,
  GitFork,
  BookOpen,
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
import { GitHubAnalysisResult } from '../../integrations/github/types';
import { rankRepositoriesByRole } from '../../integrations/github/ranker';
import { analyzeGitHubViaBackground } from '../../messaging/runtime';
import { analyzeKeywordGap } from '../../analysis/keyword-gap';
import { KeywordGapView } from './KeywordGapView';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

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
  currentFileContent?: string;
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
      githubAnalysis?: GitHubAnalysisResult;
    }
  ) => void;
  isGenerating: boolean;
  onStop?: () => void;
  onOpenSettings: () => void;
  history?: HistoryItem[];
  onViewDiff?: (diff: DiffResult) => void;
  onApplyDirect?: (text: string, originalSnippet?: string) => void;
  onAutoRepair?: () => void;
  onClearHistory?: () => void;
  onOpenTemplates?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  selectedText,
  currentFileName,
  currentFileContent = '',
  settings,
  onUpdateModel,
  onGenerate,
  isGenerating,
  onStop,
  onOpenSettings,
  history = [],
  onViewDiff,
  onApplyDirect,
  onAutoRepair,
  onClearHistory,
  onOpenTemplates,
}) => {
  // Document mode: 'resume' vs 'cover_letter'
  const [docMode, setDocMode] = useState<DocumentMode>('resume');

  // Target details
  const [targetCompany, setTargetCompany] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isTargetExpanded, setIsTargetExpanded] = useState<boolean>(false);
  const [showJdInput, setShowJdInput] = useState<boolean>(false);

  // GitHub Analysis details
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [isAnalyzingGithub, setIsAnalyzingGithub] = useState<boolean>(false);
  const [githubAnalysis, setGithubAnalysis] = useState<GitHubAnalysisResult | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [isGithubExpanded, setIsGithubExpanded] = useState<boolean>(false);

  // Prompt and preset state
  const [prompt, setPrompt] = useState<string>('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isPresetsExpanded, setIsPresetsExpanded] = useState<boolean>(false);

  // History expansion state: which history items have their full response expanded
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());

  // Sub-tabs:
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

  // Auto re-rank repositories when targetRole changes
  useEffect(() => {
    if (githubAnalysis && githubAnalysis.allProjects && githubAnalysis.allProjects.length > 0) {
      const reranked = rankRepositoriesByRole(githubAnalysis.allProjects, targetRole);
      setGithubAnalysis((prev) =>
        prev
          ? {
              ...prev,
              targetRole,
              topProjects: reranked.slice(0, 4),
              allProjects: reranked,
            }
          : null
      );
    }
  }, [targetRole]);

  // JD Keyword Gap Analysis (live calculation)
  const keywordGapResult = useMemo(() => {
    if (!jobDescription || jobDescription.trim().length === 0) return null;
    const documentBody = selectedText || currentFileContent || '';
    return analyzeKeywordGap(jobDescription, documentBody, targetRole);
  }, [jobDescription, selectedText, currentFileContent, targetRole]);

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

  const handleAnalyzeGithub = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!githubUrl.trim() || isAnalyzingGithub) return;

    setIsAnalyzingGithub(true);
    setGithubError(null);

    try {
      const result = await analyzeGitHubViaBackground(githubUrl.trim(), targetRole);
      setGithubAnalysis(result);
      setIsGithubExpanded(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGithubError(msg);
    } finally {
      setIsAnalyzingGithub(false);
    }
  };

  const handleToggleProject = (projectName: string) => {
    if (!githubAnalysis) return;
    setGithubAnalysis({
      ...githubAnalysis,
      topProjects: githubAnalysis.topProjects.map((p) =>
        p.name === projectName ? { ...p, selected: p.selected === false ? true : false } : p
      ),
    });
  };

  const handleTriggerGitHubAction = (
    actionId: 'action_github_projects' | 'action_github_skills' | 'cl_github_story'
  ) => {
    setActivePresetId(actionId);
    if (actionId === 'action_github_projects') {
      setPrompt(
        'Transform the analyzed top GitHub projects into a high-impact LaTeX Projects section using \\resumeProjectHeading and Google XYZ bullets.'
      );
    } else if (actionId === 'action_github_skills') {
      setPrompt(
        'Extract tech stack from my analyzed GitHub repos and update the LaTeX technical skills matrix.'
      );
    } else if (actionId === 'cl_github_story') {
      setPrompt(
        'Craft a compelling STAR technical narrative highlighting my key GitHub project in this cover letter.'
      );
    }
  };

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
      githubAnalysis: githubAnalysis || undefined,
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

  const toggleHistoryItemExpand = (id: string) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasApiKey = Boolean(settings.apiKeys[settings.provider]?.trim());
  const hasTarget = Boolean(targetCompany.trim() || targetRole.trim());

  const currentPresets = getCurrentPresets();
  const presetsToShow = isPresetsExpanded ? currentPresets : currentPresets.slice(0, 6);

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

  const promptChars = prompt.length;
  const promptTokens = Math.round(promptChars / 4);

  return (
    <div className="flex flex-col h-full max-h-[620px] select-none">
      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5 no-scrollbar">
        {/* 1. Document Mode Switcher + Template Library Quick Button */}
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

          {onOpenTemplates && (
            <button
              type="button"
              onClick={onOpenTemplates}
              title="Browse standard LaTeX templates"
              className="px-2 py-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0"
            >
              <BookOpen className="w-3 h-3 text-accent" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          )}
        </div>

        {/* 2. Context Badge & Target Position Bar */}
        <div className="flex flex-col gap-1.5 bg-[#151522] border border-border/70 p-2.5 rounded-xl shadow-inner shrink-0">
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

          {/* JD Keyword Gap Analysis Result if JD entered */}
          {keywordGapResult && (
            <KeywordGapView
              result={keywordGapResult}
              onFillGaps={(gapPrompt) => {
                setPrompt(gapPrompt);
                if (textareaRef.current) textareaRef.current.focus();
              }}
            />
          )}

          {/* GitHub Integration Section */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border-subtle/50 text-xs">
            {!githubAnalysis ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <GithubIcon className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAnalyzeGithub();
                      }
                    }}
                    placeholder="GitHub profile or repo link (e.g. github.com/username)..."
                    className="flex-1 px-2.5 py-1 bg-[#0f0f18] border border-border/70 rounded-lg text-[11px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyzeGithub()}
                    disabled={!githubUrl.trim() || isAnalyzingGithub}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-text-primary rounded-lg text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1"
                  >
                    {isAnalyzingGithub ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-accent" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <span>Analyze</span>
                    )}
                  </button>
                </div>
                {githubError && (
                  <div className="text-[10px] text-red-400 px-1 font-medium">{githubError}</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 bg-[#12121c] border border-border/60 p-2 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <GithubIcon className="w-3.5 h-3.5 text-white shrink-0" />
                    <a
                      href={githubAnalysis.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-text-primary font-semibold text-[11px] hover:underline flex items-center gap-0.5 truncate"
                    >
                      <span>@{githubAnalysis.username}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium shrink-0">
                      {githubAnalysis.topProjects.filter((p) => p.selected !== false).length} / {githubAnalysis.topProjects.length} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsGithubExpanded(!isGithubExpanded)}
                      className="flex items-center gap-0.5 text-[10px] text-text-muted hover:text-text-primary transition-colors"
                    >
                      <span>{isGithubExpanded ? 'Hide' : 'Projects'}</span>
                      {isGithubExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGithubAnalysis(null);
                        setGithubUrl('');
                        setIsGithubExpanded(false);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 text-text-muted hover:text-text-primary"
                      title="Remove GitHub profile"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Top Languages badges */}
                {githubAnalysis.topLanguages && githubAnalysis.topLanguages.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[9.5px] text-text-muted">
                    <Code2 className="w-3 h-3 shrink-0 text-text-secondary" />
                    {githubAnalysis.topLanguages.slice(0, 4).map((l) => (
                      <span key={l.language} className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-text-secondary">
                        {l.language}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expandable Project List with Checkboxes & Role Alignment */}
                {isGithubExpanded && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-border-subtle/50 animate-in fade-in duration-150">
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Role-Ranked Top Projects ({targetRole || 'General'}):
                    </div>

                    {githubAnalysis.topProjects.map((project) => {
                      const isSelected = project.selected !== false;
                      return (
                        <div
                          key={project.name}
                          onClick={() => handleToggleProject(project.name)}
                          className={`flex flex-col gap-0.5 p-2 rounded-lg cursor-pointer border transition-all ${
                            isSelected
                              ? 'bg-[#181828] border-accent/40 shadow-sm'
                              : 'bg-[#0f0f18] border-border/40 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-border accent-accent w-3 h-3 cursor-pointer"
                              />
                              <span className="font-semibold text-text-primary text-[11px] truncate">
                                {project.name}
                              </span>
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/10 text-text-secondary">
                                {project.language}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-[10px] text-text-muted">
                              {project.stars > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-300">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  {project.stars}
                                </span>
                              )}
                              {project.forks > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <GitFork className="w-2.5 h-2.5" />
                                  {project.forks}
                                </span>
                              )}
                            </div>
                          </div>

                          {project.description && (
                            <div className="text-[10px] text-text-secondary line-clamp-1 pl-4.5">
                              {project.description}
                            </div>
                          )}

                          {project.roleMatchReason && (
                            <div className="text-[9.5px] text-accent/90 italic line-clamp-1 pl-4.5">
                              ⚡ {project.roleMatchReason}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {docMode === 'resume' ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerGitHubAction('action_github_projects');
                            }}
                            className="flex-1 py-1 rounded-lg text-[10px] font-semibold bg-accent/20 hover:bg-accent/30 text-accent flex items-center justify-center gap-1 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>+ Add to Resume</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerGitHubAction('action_github_skills');
                            }}
                            className="py-1 px-2.5 rounded-lg text-[10px] font-medium bg-white/5 hover:bg-white/10 text-text-secondary transition-colors"
                          >
                            <span>Sync Skills</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerGitHubAction('cl_github_story');
                          }}
                          className="flex-1 py-1 rounded-lg text-[10px] font-semibold bg-accent/20 hover:bg-accent/30 text-accent flex items-center justify-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Weave Project Story into Letter</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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
            className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1 no-scrollbar border-b border-border-subtle/70 pb-2"
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
                  Clear All
                </button>
              )}
            </div>

            {history.map((item) => {
              const isExpanded = expandedHistoryIds.has(item.id);
              const isResume = item.docMode !== 'cover_letter';

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#13131f] border border-border/70 text-xs transition-all ${
                    isResume ? 'border-l-2 border-l-purple-500' : 'border-l-2 border-l-blue-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate flex-1">
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/10 text-text-muted font-medium shrink-0">
                        {isResume ? '📄 Resume' : '✉️ Cover'}
                      </span>
                      <span className="font-semibold text-text-primary text-[11px] truncate">
                        {item.userPrompt}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-text-muted shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <div
                    className={`font-mono text-[10.5px] text-text-secondary bg-[#0e0e16] p-2 rounded-lg select-text whitespace-pre-wrap ${
                      isExpanded ? 'max-h-60 overflow-y-auto' : 'line-clamp-3'
                    }`}
                  >
                    {item.response}
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={() => toggleHistoryItemExpand(item.id)}
                      className="text-[9.5px] text-text-muted hover:text-text-primary transition-colors"
                    >
                      {isExpanded ? 'Show less ▴' : 'Show more ▾'}
                    </button>

                    <div className="flex items-center gap-1.5">
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
                          onClick={() => onApplyDirect(item.response, item.diffResult?.original)}
                          className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-medium border border-emerald-800/40"
                        >
                          Apply
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.response)}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-text-muted hover:text-white"
                        title="Copy raw LaTeX"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Text Input Box with Live Token & Char Counter */}
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

          {/* Sub-bar inside textarea for stats */}
          <div className="flex items-center justify-between px-3 pb-1.5 text-[9.5px] font-mono text-text-muted border-t border-white/[0.03]">
            <span>
              {promptChars > 0 ? `${promptChars} chars · ~${promptTokens} tokens` : 'Ready to tailor'}
            </span>
            <span className="hidden sm:inline">Ctrl+Enter to generate</span>
          </div>
        </div>

        {/* 5. Specialized Presets Row with Multi-Row Expansion */}
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

            <button
              type="button"
              onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
              className="text-[9.5px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-0.5"
            >
              <span>{isPresetsExpanded ? 'Less ▴' : `All (${currentPresets.length}) ▾`}</span>
            </button>
          </div>

          {/* Chips Grid / Wrapped Chips */}
          <div className="flex flex-wrap gap-1.5 py-0.5">
            {presetsToShow.map((preset) => {
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
      </div>

      {/* 6. Sticky Bottom Toolbar */}
      <div className="px-3.5 py-2.5 bg-[#171724]/98 border-t border-border-subtle/80 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
        <ModelSelector selectedModel={settings.model} onSelectModel={onUpdateModel} />

        <div className="flex items-center gap-1.5">
          {/* Document auto-repair quick button if available */}
          {onAutoRepair && (
            <button
              type="button"
              onClick={onAutoRepair}
              title="1-Click Fix LaTeX macro errors and restored preamble"
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-all active:scale-95 flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Fix LaTeX</span>
            </button>
          )}

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
