import React from 'react';
import { Target, X } from 'lucide-react';
import { KeywordGapResult } from '../../analysis/keyword-gap';
import { Workspace } from '../hooks/useWorkspace';
import { KeywordGapView } from './KeywordGapView';
import { Chip, Collapsible, inputClass } from './ui';

interface TargetSectionProps {
  workspace: Workspace;
  onUpdate: (patch: Partial<Workspace>) => void;
  keywordGap: KeywordGapResult | null;
  onUsePrompt: (prompt: string) => void;
}

/** Target company, role, and job description — the context every tailoring request uses. */
export const TargetSection: React.FC<TargetSectionProps> = ({ workspace, onUpdate, keywordGap, onUsePrompt }) => {
  const { targetCompany, targetRole, jobDescription } = workspace;
  const hasTarget = Boolean(targetCompany.trim() || targetRole.trim() || jobDescription.trim());

  const summary = hasTarget ? (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="truncate text-zinc-200">
        {[targetCompany.trim(), targetRole.trim()].filter(Boolean).join(' · ') || 'Job description'}
      </span>
      {keywordGap && keywordGap.totalJdKeywords > 0 && (
        <Chip
          tone={keywordGap.matchPercentage >= 75 ? 'success' : keywordGap.matchPercentage >= 50 ? 'warning' : 'danger'}
          title="Share of job-description keywords already in your document"
        >
          {keywordGap.matchPercentage}% match
        </Chip>
      )}
    </span>
  ) : (
    'Add company, role, and job description'
  );

  return (
    <Collapsible
      icon={<Target className="w-3.5 h-3.5" />}
      title="Target job"
      summary={summary}
      defaultOpen={!hasTarget}
      actions={
        hasTarget ? (
          <button
            type="button"
            title="Clear target"
            onClick={() => onUpdate({ targetCompany: '', targetRole: '', jobDescription: '' })}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
          >
            <X className="w-3 h-3" />
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={targetCompany}
          onChange={(e) => onUpdate({ targetCompany: e.target.value })}
          placeholder="Company (e.g. Stripe)"
          className={inputClass}
        />
        <input
          type="text"
          value={targetRole}
          onChange={(e) => onUpdate({ targetRole: e.target.value })}
          placeholder="Role (e.g. Senior SWE)"
          className={inputClass}
        />
      </div>
      <textarea
        value={jobDescription}
        onChange={(e) => onUpdate({ jobDescription: e.target.value })}
        placeholder="Paste the job description to see which keywords your document is missing…"
        rows={3}
        className={`${inputClass} resize-y min-h-[56px] max-h-48 leading-relaxed`}
      />
      {keywordGap && <KeywordGapView result={keywordGap} onFillGaps={onUsePrompt} />}
    </Collapsible>
  );
};
