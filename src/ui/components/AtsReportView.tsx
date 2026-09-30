import React from 'react';
import { Wand2, Sparkles } from 'lucide-react';
import { AtsFix, AtsReport, AtsSeverity } from '../../analysis/ats-score';
import { Button } from './ui';

interface AtsReportViewProps {
  report: AtsReport;
  isGenerating: boolean;
  onFix: (fix: AtsFix) => void;
  /** Rendered under the "Keyword match" bar (the job's missing/covered keywords). */
  keywordDetail?: React.ReactNode;
}

export const scoreTone = (score: number) =>
  score >= 85 ? 'success' : score >= 70 ? 'accent' : score >= 50 ? 'warning' : 'danger';

const BAR_COLORS: Record<string, string> = {
  success: 'bg-emerald-400',
  accent: 'bg-indigo-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
};

const SEVERITY_DOT: Record<AtsSeverity, string> = {
  critical: 'bg-rose-400',
  warning: 'bg-amber-400',
  info: 'bg-zinc-500',
};

/** Explainable ATS readiness estimate: category bars plus the fixes that raise it. */
export const AtsReportView: React.FC<AtsReportViewProps> = ({ report, isGenerating, onFix, keywordDetail }) => {
  // The keyword chips already cover missing keywords; don't repeat them as an issue
  const issues = keywordDetail ? report.issues.filter((i) => i.id !== 'missing-keywords') : report.issues;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {report.categories.map((c) => {
          const skipped = c.weight === 0;
          const catTone = scoreTone(c.score);
          return (
            <div key={c.id} className="grid grid-cols-[104px_1fr_28px] items-center gap-x-2 gap-y-1.5 text-[10.5px]">
              <span className="text-zinc-400 truncate">{c.label}</span>
              {skipped ? (
                <span className="text-zinc-500 italic">needs a job description</span>
              ) : (
                <div
                  className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"
                  role="meter"
                  aria-label={c.label}
                  aria-valuenow={c.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className={`h-full rounded-full ${BAR_COLORS[catTone]}`} style={{ width: `${c.score}%` }} />
                </div>
              )}
              <span className="text-right font-mono text-zinc-300">{skipped ? '—' : c.score}</span>
              {c.id === 'keywords' && keywordDetail && <div className="col-span-3 pl-1 pb-1">{keywordDetail}</div>}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] font-mono text-zinc-500">
        {report.stats.bullets} bullets · {report.stats.quantifiedPercent}% quantified · {report.stats.actionVerbPercent}% action verbs ·{' '}
        {report.stats.words} words
      </div>

      {issues.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {issues.map((issue) => (
            <li key={issue.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-1 border border-line">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[issue.severity]}`} aria-label={issue.severity} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-zinc-100 leading-snug">{issue.title}</div>
                <div className="text-[10.5px] text-zinc-400 leading-snug">{issue.detail}</div>
              </div>
              {issue.fix && (
                <Button
                  size="xs"
                  variant={issue.fix.kind === 'patch' ? 'success' : 'secondary'}
                  disabled={isGenerating && issue.fix.kind === 'ai'}
                  title={issue.fix.kind === 'patch' ? 'Deterministic fix, shown for review first' : 'Ask the AI, then review the change'}
                  onClick={() => onFix(issue.fix!)}
                  icon={issue.fix.kind === 'patch' ? <Wand2 className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                  className="shrink-0"
                >
                  {issue.fix.label}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[11px] text-emerald-200">No issues found.</div>
      )}

      <p className="text-[10px] text-zinc-500 leading-snug">
        An estimate of how ATS parsers read your resume. Real systems differ; treat the issues, not the number, as the guide.
      </p>
    </div>
  );
};
