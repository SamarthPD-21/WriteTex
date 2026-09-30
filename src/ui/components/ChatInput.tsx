import React, { useMemo, useState } from 'react';
import { FileText, Mail, KeyRound, TextSelect } from 'lucide-react';
import { AIProviderId, DocumentMode, Settings } from '../../messaging/types';
import { BasePreset, COVER_LETTER_PRESETS, ROLE_PRESETS } from '../../prompts/presets';
import { analyzeKeywordGap } from '../../analysis/keyword-gap';
import { AtsFix, scoreAtsReadiness } from '../../analysis/ats-score';
import { scrapeOverleafErrors } from '../../adapters/overleaf/error-scraper';
import { OverleafDiagnosticsResult } from '../../adapters/overleaf/error-scraper';
import { HistoryItem, Workspace } from '../hooks/useWorkspace';
import { JobMatchSection } from './JobMatchSection';
import { GitHubAction, GitHubSection } from './GitHubSection';
import { DiagnosticsCard } from './DiagnosticsCard';
import { HistorySection } from './HistorySection';
import { PresetBar } from './PresetBar';
import { PromptComposer } from './PromptComposer';
import { Button, CardGroup, Chip } from './ui';

const PROVIDER_LABELS: Record<AIProviderId, string> = { anthropic: 'Claude', gemini: 'Gemini', openai: 'OpenAI', meta: 'Meta' };

const GITHUB_ACTION_PROMPTS: Record<GitHubAction, string> = {
  action_github_projects:
    'Write my Projects section from the selected GitHub projects using \\resumeProjectHeading and impact-focused bullets.',
  action_github_skills: 'Update my technical skills section with the languages and tools verified in my GitHub projects.',
  cl_github_story: 'Weave my strongest selected GitHub project into this cover letter as a concise STAR story.',
};

export interface GenerateExtras {
  overleafErrors?: OverleafDiagnosticsResult['entries'];
  hasNoPdf?: boolean;
}

interface ChatInputProps {
  workspace: Workspace;
  onUpdateWorkspace: (patch: Partial<Workspace>) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedText: string;
  currentFileName: string;
  currentFileContent: string;
  settings: Settings;
  onUpdateModel: (provider: AIProviderId, model: string) => void;
  onGenerate: (prompt: string, presetKey?: string, extras?: GenerateExtras) => void;
  isGenerating: boolean;
  onStop: () => void;
  onOpenSettings: () => void;
  onReviewHistory: (item: HistoryItem) => void;
  onPreview: (label: string, latex: string) => void;
  onAutoRepair: () => void;
  /** Re-reads the live document so scans see the latest text. */
  onRefreshDocument: () => Promise<void>;
  /** Applies a deterministic ATS patch through the review screen. */
  onAtsPatch: (patch: 'unicode-mapping') => void;
}

/** The input view: context set-up on top, presets, and a composer pinned to the bottom. */
export const ChatInput: React.FC<ChatInputProps> = ({
  workspace,
  onUpdateWorkspace,
  prompt,
  onPromptChange,
  selectedText,
  currentFileName,
  currentFileContent,
  settings,
  onUpdateModel,
  onGenerate,
  isGenerating,
  onStop,
  onOpenSettings,
  onReviewHistory,
  onPreview,
  onAutoRepair,
  onRefreshDocument,
  onAtsPatch,
}) => {
  const { docMode } = workspace;
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [scanRequest, setScanRequest] = useState(0);

  const keywordGap = useMemo(() => {
    if (!workspace.jobDescription.trim() || !currentFileContent) return null;
    return analyzeKeywordGap(workspace.jobDescription, currentFileContent, workspace.targetRole);
  }, [workspace.jobDescription, workspace.targetRole, currentFileContent]);

  const atsReport = useMemo(() => {
    // No score without a job description: ATS ranking is always relative to a specific job
    if (docMode !== 'resume' || workspace.jobDescription.trim().length < 20 || !currentFileContent.includes('\\begin{document}')) return null;
    const log = scrapeOverleafErrors();
    return scoreAtsReadiness({
      latex: currentFileContent,
      jobDescription: workspace.jobDescription,
      targetRole: workspace.targetRole,
      hasCompileErrors: log.hasNoPdf || log.entries.some((e) => e.type === 'error'),
    });
  }, [docMode, currentFileContent, workspace.jobDescription, workspace.targetRole]);

  const runAtsFix = (fix: AtsFix) => {
    if (fix.kind === 'patch') onAtsPatch(fix.patch);
    else onGenerate(fix.prompt, fix.prompt.startsWith('Fix the LaTeX compile errors') ? 'fix_errors' : undefined);
  };

  const allPresets: BasePreset[] = docMode === 'resume' ? ROLE_PRESETS : COVER_LETTER_PRESETS;
  const activePreset = allPresets.find((p) => p.id === activePresetId) || null;
  const hasApiKey = Boolean(settings.apiKeys[settings.provider]?.trim());
  const hasSelection = selectedText.trim().length > 0;

  const submit = () => {
    const text = prompt.trim() || activePreset?.userPrompt || '';
    if (!text) return;
    onGenerate(text, activePresetId || undefined);
    onPromptChange('');
    setActivePresetId(null);
  };

  const setMode = (mode: DocumentMode) => {
    onUpdateWorkspace({ docMode: mode, docModeLocked: true });
    setActivePresetId(null);
  };

  const placeholder = hasSelection
    ? docMode === 'resume'
      ? 'What should change in the selection? e.g. "Tighten these bullets for a backend role"'
      : 'What should change in the selected text? e.g. "Make this paragraph more concise"'
    : docMode === 'resume'
    ? 'Describe an edit, or select text in Overleaf first. e.g. "Tailor my experience to the job"'
    : 'e.g. "Draft a cover letter for this role from my resume"';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 flex flex-col gap-2 no-scrollbar [&>*]:shrink-0">
        {/* Context strip: what WriteTex will act on */}
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 bg-surface-0 rounded-lg border border-line">
            {(
              [
                ['resume', 'Resume', FileText],
                ['cover_letter', 'Cover letter', Mail],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                aria-pressed={docMode === mode}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold transition-colors ${
                  docMode === mode ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
          <span className="ml-auto min-w-0 truncate font-mono text-[10.5px] text-zinc-400" title={currentFileName}>
            {currentFileName}
          </span>
          {hasSelection ? (
            <Chip tone="success" title="Your edit will replace exactly this selection">
              <TextSelect className="w-2.5 h-2.5" />
              {selectedText.length} chars
            </Chip>
          ) : null}
        </div>

        {!hasApiKey && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-100">
            <KeyRound className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="flex-1">Add your {PROVIDER_LABELS[settings.provider]} API key to start.</span>
            <Button size="xs" variant="primary" onClick={onOpenSettings}>
              Open settings
            </Button>
          </div>
        )}

        <DiagnosticsCard
          fileName={currentFileName}
          fileContent={currentFileContent}
          scanRequest={scanRequest}
          isGenerating={isGenerating}
          onAutoRepair={onAutoRepair}
          onFixWithAI={(diag) => {
            const titles = diag.entries.length > 0 ? diag.entries.map((e) => e.title).join('; ') : 'No PDF produced';
            onGenerate(`Fix the LaTeX compile errors: ${titles}`, 'fix_errors', {
              overleafErrors: diag.entries,
              hasNoPdf: diag.hasNoPdf,
            });
          }}
        />

        <CardGroup>
          <JobMatchSection
            bare
            workspace={workspace}
            onUpdate={onUpdateWorkspace}
            keywordGap={keywordGap}
            atsReport={atsReport}
            scoresAts={docMode === 'resume'}
            isGenerating={isGenerating}
            onFix={runAtsFix}
            onUsePrompt={onPromptChange}
          />
          <GitHubSection
            bare
            workspace={workspace}
            onUpdate={onUpdateWorkspace}
            isGenerating={isGenerating}
            onPreview={onPreview}
            onRunAction={(action) => onGenerate(GITHUB_ACTION_PROMPTS[action], action)}
          />
          {workspace.history.length > 0 && (
            <HistorySection
              bare
              history={workspace.history}
              onReuse={onPromptChange}
              onReview={onReviewHistory}
              onClear={() => onUpdateWorkspace({ history: [] })}
            />
          )}
        </CardGroup>

        <PresetBar
          docMode={docMode}
          activePresetId={activePresetId}
          onSelect={(preset) => {
            setActivePresetId(preset?.id ?? null);
            onPromptChange(preset?.userPrompt ?? '');
          }}
        />
      </div>

      <PromptComposer
        prompt={prompt}
        onPromptChange={(value) => {
          onPromptChange(value);
          if (activePreset && value !== activePreset.userPrompt) setActivePresetId(null);
        }}
        placeholder={placeholder}
        canSubmit={Boolean(prompt.trim() || activePreset)}
        onSubmit={submit}
        isGenerating={isGenerating}
        onStop={onStop}
        recentPrompts={workspace.history.map((h) => h.prompt)}
        attachments={workspace.attachedFiles}
        onAttachmentsChange={(attachedFiles) => onUpdateWorkspace({ attachedFiles })}
        onUseAsJobDescription={(text) => onUpdateWorkspace({ jobDescription: text })}
        settings={settings}
        onSelectModel={onUpdateModel}
        onFixLatex={() => onRefreshDocument().then(() => setScanRequest((n) => n + 1))}
      />
    </div>
  );
};
