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
  CheckCircle2,
  AlertOctagon,
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
import { scrapeOverleafErrors, OverleafDiagnosticsResult, OverleafLogEntry } from '../../adapters/overleaf/error-scraper';
import { autoRepairLatexDocument } from '../../latex/auto-repair';

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
      overleafErrors?: OverleafLogEntry[];
      hasNoPdf?: boolean;
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

  // History expansion state
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());

  // Sub-tabs:
  const [resumeTab, setResumeTab] = useState<'roles' | 'actions'>('roles');
  const [clTab, setClTab] = useState<'sections' | 'tones'>('sections');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Overleaf compilation diagnostics state
  const [diagnostics, setDiagnostics] = useState<OverleafDiagnosticsResult | null>(null);
  const [isFetchingErrors, setIsFetchingErrors] = useState<boolean>(false);

  // Auto-scan for Overleaf errors on mount and when fileName changes
  useEffect(() => {
    const diag = scrapeOverleafErrors();
    if (diag.hasErrors || diag.hasNoPdf) {
      setDiagnostics(diag);
    }
  }, [currentFileName]);

  const handleFetchErrors = () => {
    setIsFetchingErrors(true);
    try {
      const diag = scrapeOverleafErrors();
      if (diag.hasErrors || diag.hasNoPdf) {
        setDiagnostics(diag);
      } else {
        const repairCheck = autoRepairLatexDocument(currentFileContent || '');
        if (repairCheck.wasRepaired) {
          setDiagnostics({
            hasErrors: true,
            hasNoPdf: false,
            entries: repairCheck.repairsMade.map((r) => ({
              type: 'error',
              title: r,
              message: r,
            })),
            summary: 'Detected corrupted preamble / macros in document buffer.',
          });
        } else {
          setDiagnostics({
            hasErrors: false,
            hasNoPdf: false,
            entries: [],
            summary: 'No compiler errors found in Overleaf log panel or document.',
          });
        }
      }
    } finally {
      setIsFetchingErrors(false);
    }
  };

  const handleFixErrorsWithAI = () => {
    const errorTitles =
      diagnostics && diagnostics.entries.length > 0
        ? diagnostics.entries.map((e) => e.title).join(', ')
        : 'Compiler halt (No PDF produced)';

    const fixPrompt = `Resolve Overleaf LaTeX failure (${diagnostics?.hasNoPdf ? 'No PDF' : 'errors'}): ${errorTitles}. Repair truncated preamble macros and fix syntax.`;

    onGenerate(fixPrompt, 'fix_errors', {
      docMode,
      targetCompany: targetCompany.trim() || undefined,
      targetRole: targetRole.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      githubAnalysis: githubAnalysis || undefined,
      overleafErrors: diagnostics?.entries,
      hasNoPdf: diagnostics?.hasNoPdf ?? true,
    });
  };

  // Auto-detect document mode from filename
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
      overleafErrors: diagnostics?.entries,
      hasNoPdf: diagnostics?.hasNoPdf,
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
      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-3 no-scrollbar">
        {/* 1. Document Mode Switcher (Clean 2-tab segmented control, NO duplicate emoji) */}
        <div className="flex items-center p-1 bg-[#0e0e18] rounded-xl border border-white/[0.08] shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setDocMode('resume');
              setActivePresetId(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              docMode === 'resume'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Resume / CV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocMode('cover_letter');
              setActivePresetId(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              docMode === 'cover_letter'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Cover Letter</span>
          </button>
        </div>

        {/* 2. Context Badge & Target Position Card */}
        <div className="flex flex-col gap-2 bg-[#141422] border border-white/[0.08] p-3 rounded-xl shadow-sm shrink-0">
          {/* Top row: Current file and selection status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-mono text-zinc-200 text-[11.5px] truncate font-medium">
                {currentFileName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Fetch Errors Button */}
              <button
                type="button"
                onClick={handleFetchErrors}
                title="Scan Overleaf compilation logs for errors and warnings"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 transition-all active:scale-95 shrink-0"
              >
                <AlertOctagon className="w-3 h-3 text-rose-400" />
                <span>{isFetchingErrors ? 'Checking...' : 'Fetch Errors'}</span>
              </button>

              {selectedText && selectedText.trim().length > 0 ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10.5px] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{selectedText.length} chars selected</span>
                </div>
              ) : (
                <span className="text-[10.5px] text-zinc-400 italic">
                  {docMode === 'resume' ? 'Select bullets to tailor' : 'Select items to draft'}
                </span>
              )}
            </div>
          </div>

          {/* Target Position Row */}
          <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-xs">
            {hasTarget ? (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-amber-400 text-[11px] shrink-0 font-medium">🎯 Target:</span>
                <span className="text-zinc-100 font-medium text-[11px] truncate">
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
                  className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white shrink-0 transition-colors"
                  title="Clear target"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsTargetExpanded(!isTargetExpanded)}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-indigo-400 font-medium transition-colors"
              >
                <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Target Company & Role (e.g. Stripe · Senior SWE)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsTargetExpanded(!isTargetExpanded)}
              className="flex items-center gap-0.5 text-[10.5px] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0 ml-1 font-medium"
            >
              <span>{isTargetExpanded ? 'Hide' : 'Edit'}</span>
              {isTargetExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expandable Target Details Drawer */}
          {isTargetExpanded && (
            <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06] text-xs animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="Company (e.g. Stripe, Google)"
                  className="px-2.5 py-1.5 bg-[#0d0d16] border border-white/[0.08] rounded-lg text-[11px] text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-indigo-500 transition-colors"
                />
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Role (e.g. Senior SWE)"
                  className="px-2.5 py-1.5 bg-[#0d0d16] border border-white/[0.08] rounded-lg text-[11px] text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowJdInput(!showJdInput)}
                  className="text-[10.5px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium transition-colors"
                >
                  <span>{showJdInput ? '− Hide Job Description' : '+ Add Job Description / Requirements'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTargetExpanded(false)}
                  className="px-2.5 py-0.5 rounded-md text-[10.5px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium transition-colors"
                >
                  Done
                </button>
              </div>

              {showJdInput && (
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job description or requirements here to enable live keyword matching..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-[#0d0d16] border border-white/[0.08] rounded-lg text-[11px] text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-indigo-500 resize-none leading-relaxed transition-colors"
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
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/[0.06] text-xs">
            {!githubAnalysis ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <GithubIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
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
                    placeholder="GitHub profile or repo (e.g. github.com/username)..."
                    className="flex-1 px-2.5 py-1 bg-[#0d0d16] border border-white/[0.08] rounded-lg text-[11px] text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyzeGithub()}
                    disabled={!githubUrl.trim() || isAnalyzingGithub}
                    className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 rounded-lg text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1"
                  >
                    {isAnalyzingGithub ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <span>Analyze</span>
                    )}
                  </button>
                </div>
                {githubError && (
                  <div className="text-[10px] text-rose-400 px-1 font-medium">{githubError}</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 bg-[#0d0d16] border border-white/[0.06] p-2.5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <GithubIcon className="w-3.5 h-3.5 text-white shrink-0" />
                    <a
                      href={githubAnalysis.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-100 font-semibold text-[11.5px] hover:underline flex items-center gap-1 truncate"
                    >
                      <span>@{githubAnalysis.username}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium shrink-0">
                      {githubAnalysis.topProjects.filter((p) => p.selected !== false).length} / {githubAnalysis.topProjects.length} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsGithubExpanded(!isGithubExpanded)}
                      className="flex items-center gap-0.5 text-[10.5px] text-zinc-400 hover:text-white transition-colors"
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
                      className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Remove GitHub profile"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Top Languages badges */}
                {githubAnalysis.topLanguages && githubAnalysis.topLanguages.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[9.5px] text-zinc-400">
                    <Code2 className="w-3 h-3 shrink-0 text-zinc-400" />
                    {githubAnalysis.topLanguages.slice(0, 4).map((l) => (
                      <span key={l.language} className="px-1.5 py-0.5 rounded bg-white/[0.04] font-mono text-zinc-300">
                        {l.language}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expandable Project List */}
                {isGithubExpanded && (
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/[0.06] animate-in fade-in duration-150">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Role-Ranked Projects ({targetRole || 'General'}):
                    </div>

                    {githubAnalysis.topProjects.map((project) => {
                      const isSelected = project.selected !== false;
                      return (
                        <div
                          key={project.name}
                          onClick={() => handleToggleProject(project.name)}
                          className={`flex flex-col gap-0.5 p-2 rounded-lg cursor-pointer border transition-all ${
                            isSelected
                              ? 'bg-[#18182a] border-indigo-500/40 shadow-xs'
                              : 'bg-[#0a0a12] border-white/[0.04] opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-white/20 accent-indigo-600 w-3 h-3 cursor-pointer"
                              />
                              <span className="font-semibold text-zinc-200 text-[11px] truncate">
                                {project.name}
                              </span>
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">
                                {project.language}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-[10px] text-zinc-400">
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
                            <div className="text-[10px] text-zinc-400 line-clamp-1 pl-4.5">
                              {project.description}
                            </div>
                          )}

                          {project.roleMatchReason && (
                            <div className="text-[9.5px] text-indigo-300 italic line-clamp-1 pl-4.5">
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
                            className="flex-1 py-1 rounded-lg text-[10.5px] font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 flex items-center justify-center gap-1 transition-colors"
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
                            className="py-1 px-2.5 rounded-lg text-[10.5px] font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition-colors"
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
                          className="flex-1 py-1 rounded-lg text-[10.5px] font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 flex items-center justify-center gap-1 transition-colors"
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

        {/* Overleaf Compilation Diagnostics / "No PDF" Alert Card */}
        {diagnostics && (diagnostics.hasErrors || diagnostics.hasNoPdf) && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-gradient-to-br from-rose-950/40 to-red-900/20 border border-rose-500/30 text-xs shadow-md shrink-0 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-rose-200 text-[12px] flex items-center gap-1.5">
                    <span>{diagnostics.hasNoPdf ? 'Overleaf "No PDF" Error' : 'LaTeX Compilation Halt'}</span>
                    {diagnostics.hasNoPdf && (
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-rose-500/30 text-rose-300 font-bold uppercase tracking-wider">
                        No PDF
                      </span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-zinc-400 mt-0.5">
                    {diagnostics.summary}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDiagnostics(null)}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded-md transition-colors"
                title="Dismiss alert"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Error Entries (show up to 3 key errors if any) */}
            {diagnostics.entries.length > 0 && (
              <div className="flex flex-col gap-1 my-0.5 max-h-24 overflow-y-auto bg-black/40 p-2 rounded-lg border border-rose-500/15 font-mono text-[10.5px] text-rose-300/90">
                {diagnostics.entries.slice(0, 3).map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 leading-tight">
                    <span className="text-rose-500 font-bold shrink-0">•</span>
                    <span className="truncate">
                      {entry.line ? `Line ${entry.line}: ` : ''}
                      {entry.title}
                    </span>
                  </div>
                ))}
                {diagnostics.entries.length > 3 && (
                  <div className="text-[9.5px] text-zinc-400 italic">
                    +{diagnostics.entries.length - 3} more issue(s) in Overleaf log panel
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
              {onAutoRepair && (
                <button
                  type="button"
                  onClick={async () => {
                    onAutoRepair();
                    setTimeout(() => {
                      const updated = scrapeOverleafErrors();
                      setDiagnostics(updated.hasErrors || updated.hasNoPdf ? updated : null);
                    }, 500);
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1-Click Auto-Repair</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFixErrorsWithAI}
                disabled={isGenerating}
                className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Fix with AI</span>
              </button>
            </div>
          </div>
        )}

        {/* Clean status if user explicitly clicked "Fetch Errors" and no errors found */}
        {diagnostics && !diagnostics.hasErrors && !diagnostics.hasNoPdf && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ No Overleaf compilation errors found in logs or document buffer</span>
            </div>
            <button
              type="button"
              onClick={() => setDiagnostics(null)}
              className="p-1 text-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/10 rounded-md transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* API Key Alert if missing */}
        {!hasApiKey && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Missing {settings.provider.toUpperCase()} API key</span>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-[11px] transition-colors shadow-xs active:scale-95"
            >
              Configure
            </button>
          </div>
        )}

        {/* 3. Past Requests / History Thread (No clipping, natural layout) */}
        {history.length > 0 && (
          <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center justify-between px-0.5 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>Recent Requests ({history.length})</span>
              </span>
              {onClearHistory && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="hover:text-zinc-200 text-[9.5px] hover:underline transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            <div
              ref={historyContainerRef}
              className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-0.5 no-scrollbar"
            >
              {history.map((item) => {
                const isExpanded = expandedHistoryIds.has(item.id);
                const isResume = item.docMode !== 'cover_letter';

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#131320] border border-white/[0.06] text-xs transition-all ${
                      isResume ? 'border-l-2 border-l-violet-500' : 'border-l-2 border-l-indigo-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate flex-1">
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 font-medium shrink-0">
                          {isResume ? 'Resume' : 'Cover'}
                        </span>
                        <span className="font-semibold text-zinc-200 text-[11.5px] truncate">
                          {item.userPrompt}
                        </span>
                      </div>
                      <span className="text-[9.5px] font-mono text-zinc-400 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <div
                      className={`font-mono text-[10.5px] text-zinc-300 bg-[#0c0c14] p-2 rounded-lg select-text whitespace-pre-wrap leading-relaxed ${
                        isExpanded ? 'max-h-60 overflow-y-auto' : 'line-clamp-3'
                      }`}
                    >
                      {item.response}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleHistoryItemExpand(item.id)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
                      >
                        {isExpanded ? 'Show less ▴' : 'Show full output ▾'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPrompt(item.userPrompt)}
                          className="h-6 px-2 rounded-md text-[10.5px] bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          <span>Reuse</span>
                        </button>

                        {item.diffResult && onViewDiff && (
                          <button
                            type="button"
                            onClick={() => onViewDiff(item.diffResult!)}
                            className="h-6 px-2 rounded-md text-[10.5px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                          >
                            <GitCompare className="w-2.5 h-2.5" />
                            <span>Diff</span>
                          </button>
                        )}

                        {onApplyDirect && (
                          <button
                            type="button"
                            onClick={() => onApplyDirect(item.response, item.diffResult?.original)}
                            className="h-6 px-2 rounded-md text-[10.5px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium border border-emerald-500/30 flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>Apply</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.response)}
                          className="h-6 w-6 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                          title="Copy raw LaTeX"
                        >
                          {copiedId === item.id ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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
          </div>
        )}

        {/* 4. Text Input Box with Live Token & Char Counter */}
        <div className="relative flex flex-col rounded-xl bg-[#11111b] border border-white/[0.08] focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-150 shadow-inner shrink-0">
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
              className="w-full px-3.5 pt-3 pb-2 pr-8 bg-transparent text-zinc-100 placeholder:text-zinc-400 text-xs resize-none outline-none leading-relaxed select-text"
            />

            {prompt && (
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  setActivePresetId(null);
                }}
                title="Clear input"
                className="absolute right-2.5 top-2.5 p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sub-bar inside textarea for live counters */}
          <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-mono text-zinc-400 border-t border-white/[0.03]">
            <span>
              {promptChars > 0 ? `${promptChars} chars · ~${promptTokens} tokens` : 'Ready to tailor'}
            </span>
            <span className="hidden sm:inline">Press Ctrl+Enter to generate</span>
          </div>
        </div>

        {/* 5. Specialized Presets Row with Clean Segmented Switcher */}
        <div className="flex flex-col gap-2 pt-0.5 shrink-0">
          <div className="flex items-center justify-between px-0.5">
            {docMode === 'resume' ? (
              <div className="flex items-center gap-1.5 p-0.5 bg-[#0e0e18] rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setResumeTab('roles')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold tracking-wide flex items-center gap-1.5 transition-all ${
                    resumeTab === 'roles'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Briefcase className="w-3 h-3" />
                  <span>Target Roles</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResumeTab('actions')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold tracking-wide flex items-center gap-1.5 transition-all ${
                    resumeTab === 'actions'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Polish Actions</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-0.5 bg-[#0e0e18] rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setClTab('sections')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold tracking-wide flex items-center gap-1.5 transition-all ${
                    clTab === 'sections'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Sections</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClTab('tones')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold tracking-wide flex items-center gap-1.5 transition-all ${
                    clTab === 'tones'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Tone</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors font-medium flex items-center gap-0.5"
            >
              <span>{isPresetsExpanded ? 'Less ▴' : `All (${currentPresets.length}) ▾`}</span>
            </button>
          </div>

          {/* Preset Chips */}
          <div className="flex flex-wrap gap-1.5 py-0.5">
            {presetsToShow.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  title={preset.description}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-150 select-none flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/30 scale-[1.02]'
                      : 'bg-[#151524] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-[#1f1f34] hover:border-indigo-500/40'
                  }`}
                >
                  {preset.icon && <span>{preset.icon}</span>}
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. Solid Elevated Bottom Toolbar */}
      <div className="relative z-30 px-3.5 py-2.5 bg-[#131320] border-t border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
        <ModelSelector selectedModel={settings.model} onSelectModel={onUpdateModel} />

        <div className="flex items-center gap-2">
          {/* Document auto-repair quick button if available */}
          {onAutoRepair && (
            <button
              type="button"
              onClick={onAutoRepair}
              title="1-Click Fix LaTeX macro errors and restored preamble"
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Fix LaTeX</span>
            </button>
          )}

          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 shadow-md transition-all duration-150 active:scale-95 animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={(!prompt.trim() && !activePresetId) || !hasApiKey}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/25 transition-all duration-150 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate</span>
              <KeyboardShortcutHint
                shortcut="Ctrl+↵"
                variant="on-accent"
                className="hidden sm:inline-flex"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
