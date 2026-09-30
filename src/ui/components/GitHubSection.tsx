import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, GitFork, Loader2, Sparkles, Star, X, ArrowRight, Eye } from 'lucide-react';
import { GitHubAnalysisResult } from '../../integrations/github/types';
import { rankRepositoriesByRole } from '../../integrations/github/ranker';
import { analyzeGitHubViaBackground } from '../../messaging/runtime';
import { formatAllProjectsToLatex, formatProjectToLatex } from '../../integrations/github/formatter';
import { Workspace } from '../hooks/useWorkspace';
import { Button, Chip, Collapsible } from './ui';

export const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export type GitHubAction = 'action_github_projects' | 'action_github_skills' | 'cl_github_story';

interface GitHubSectionProps {
  /** Render as a row inside a CardGroup. */
  bare?: boolean;
  workspace: Workspace;
  onUpdate: (patch: Partial<Workspace>) => void;
  /** Runs an AI preset that uses the analyzed projects. */
  onRunAction: (action: GitHubAction) => void;
  /** Shows deterministic LaTeX in the review screen before anything is written. */
  onPreview: (label: string, latex: string) => void;
  isGenerating: boolean;
}

export const GitHubSection: React.FC<GitHubSectionProps> = ({ bare, workspace, onUpdate, onRunAction, onPreview, isGenerating }) => {
  const { githubUrl, githubAnalysis: analysis, targetRole, jobDescription, docMode } = workspace;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Re-rank when the target changes
  useEffect(() => {
    if (!analysis?.allProjects?.length) return;
    const role = targetRole.trim() || undefined;
    const jd = jobDescription.trim() || undefined;
    if (analysis.targetRole === role && analysis.targetJobDescription === jd) return;
    const selectedNames = new Set(analysis.topProjects.filter((p) => p.selected !== false).map((p) => p.name));
    const reranked = rankRepositoriesByRole(analysis.allProjects, role, jd);
    onUpdate({
      githubAnalysis: {
        ...analysis,
        targetRole: role,
        targetJobDescription: jd,
        allProjects: reranked,
        topProjects: reranked.slice(0, 4).map((p) => ({ ...p, selected: selectedNames.size === 0 || selectedNames.has(p.name) })),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole, jobDescription]);

  const analyze = async () => {
    if (!githubUrl.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeGitHubViaBackground(
        githubUrl.trim(),
        targetRole.trim() || undefined,
        jobDescription.trim() || undefined
      );
      onUpdate({ githubAnalysis: result });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  const toggleProject = (name: string) => {
    if (!analysis) return;
    const inTop = analysis.topProjects.some((p) => p.name === name);
    const topProjects = inTop
      ? analysis.topProjects.map((p) => (p.name === name ? { ...p, selected: p.selected === false } : p))
      : [...analysis.topProjects, { ...analysis.allProjects.find((p) => p.name === name)!, selected: true }];
    onUpdate({ githubAnalysis: { ...analysis, topProjects } });
  };

  const selectedCount = analysis ? analysis.topProjects.filter((p) => p.selected !== false).length : 0;
  const summary = analysis ? (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="truncate text-zinc-200">@{analysis.username}</span>
      <Chip tone="accent">{selectedCount} selected</Chip>
    </span>
  ) : (
    'Ground project bullets in your real repos'
  );

  const visibleProjects: GitHubAnalysisResult['topProjects'] = analysis
    ? languageFilter
      ? analysis.allProjects.filter((p) => (p.language || '').toLowerCase() === languageFilter.toLowerCase())
      : analysis.topProjects
    : [];

  return (
    <Collapsible
      bare={bare}
      icon={<GithubIcon />}
      title="GitHub"
      summary={summary}
      actions={
        analysis ? (
          <button
            type="button"
            title="Remove GitHub profile"
            onClick={() => onUpdate({ githubAnalysis: null, githubUrl: '' })}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
          >
            <X className="w-3 h-3" />
          </button>
        ) : undefined
      }
    >
      {!analysis ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              analyze();
            }}
            className="flex items-stretch bg-surface-0 border border-line rounded-lg overflow-hidden focus-within:border-indigo-500/70"
          >
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => onUpdate({ githubUrl: e.target.value })}
              placeholder="github.com/username or a repo URL"
              className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-[11px] text-zinc-100 placeholder:text-zinc-500 outline-none"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-none"
              disabled={!githubUrl.trim() || isAnalyzing}
              icon={isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
            >
              {isAnalyzing ? 'Analyzing' : 'Analyze'}
            </Button>
          </form>
          {error && <div className="text-[10.5px] text-rose-300">{error}</div>}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">
            {analysis.avatarUrl && (
              <img src={analysis.avatarUrl} alt="" className="w-6 h-6 rounded-full border border-line shrink-0" />
            )}
            <div className="min-w-0">
              <a
                href={analysis.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11.5px] font-semibold text-zinc-100 hover:text-indigo-300 flex items-center gap-1"
              >
                {analysis.name || `@${analysis.username}`}
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
              {analysis.bio && <div className="text-[10px] text-zinc-500 truncate">{analysis.bio}</div>}
            </div>
            {(analysis.totalStars ?? 0) > 0 && (
              <Chip tone="warning" className="ml-auto shrink-0">
                <Star className="w-2.5 h-2.5 fill-current" />
                {analysis.totalStars}
              </Chip>
            )}
          </div>

          {analysis.topLanguages?.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[null, ...analysis.topLanguages.slice(0, 5).map((l) => l.language)].map((lang) => {
                const active = languageFilter === lang;
                return (
                  <button
                    key={lang ?? 'all'}
                    type="button"
                    onClick={() => setLanguageFilter(lang)}
                    className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
                      active ? 'bg-indigo-600 text-white' : 'bg-white/[0.05] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lang ?? 'Top picks'}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto no-scrollbar">
            {visibleProjects.map((project) => {
              const top = analysis.topProjects.find((p) => p.name === project.name);
              const isSelected = Boolean(top) && top!.selected !== false;
              return (
                <div
                  key={project.name}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => toggleProject(project.name)}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleProject(project.name))}
                  className={`flex flex-col gap-0.5 p-2 rounded-lg cursor-pointer border transition-colors ${
                    isSelected ? 'bg-surface-3 border-indigo-500/40' : 'bg-surface-1 border-line opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-[4px] border shrink-0 flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 border-indigo-500' : 'border-zinc-600'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="font-semibold text-zinc-200 text-[11px] truncate">{project.name}</span>
                    {project.language && <Chip className="font-mono">{project.language}</Chip>}
                    <span className="ml-auto flex items-center gap-2 shrink-0 text-[10px] text-zinc-500">
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
                      <button
                        type="button"
                        title="Copy LaTeX for this project"
                        onClick={(e) => {
                          e.stopPropagation();
                          copy(project.name, formatProjectToLatex(project));
                        }}
                        className="p-0.5 rounded hover:bg-white/10 hover:text-white"
                      >
                        {copied === project.name ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                  </div>
                  {project.description && <div className="text-[10px] text-zinc-400 line-clamp-1 pl-4">{project.description}</div>}
                  {project.roleMatchReason && (
                    <div className="text-[9.5px] text-indigo-300/90 line-clamp-1 pl-4">{project.roleMatchReason}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {docMode === 'resume' ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  disabled={isGenerating || selectedCount === 0}
                  onClick={() => onRunAction('action_github_projects')}
                  icon={<Sparkles className="w-3 h-3" />}
                >
                  Write Projects section
                </Button>
                <Button
                  size="sm"
                  disabled={selectedCount === 0}
                  title="Review a plain, facts-only Projects section (no AI)"
                  onClick={() => onPreview('GitHub projects (facts only)', formatAllProjectsToLatex(analysis.topProjects))}
                  icon={<Eye className="w-3 h-3" />}
                >
                  Facts only
                </Button>
                <Button
                  size="sm"
                  disabled={isGenerating}
                  title="Update your skills section from languages and verified dependencies"
                  onClick={() => onRunAction('action_github_skills')}
                >
                  Sync skills
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                disabled={isGenerating || selectedCount === 0}
                onClick={() => onRunAction('cl_github_story')}
                icon={<Sparkles className="w-3 h-3" />}
              >
                Weave project story into letter
              </Button>
            )}
          </div>
        </>
      )}
    </Collapsible>
  );
};
