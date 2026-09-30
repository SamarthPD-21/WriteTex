import React, { useRef, useState } from 'react';
import { FileUp, Loader2, Target, X } from 'lucide-react';
import { extractTextFromFile } from '../../integrations/files/extractor';
import { KeywordGapResult } from '../../analysis/keyword-gap';
import { AtsFix, AtsReport } from '../../analysis/ats-score';
import { Workspace } from '../hooks/useWorkspace';
import { KeywordGapView } from './KeywordGapView';
import { AtsReportView, scoreTone } from './AtsReportView';
import { Button, Chip, Collapsible, inputClass } from './ui';

interface JobMatchSectionProps {
  /** Render as a row inside a CardGroup. */
  bare?: boolean;
  workspace: Workspace;
  onUpdate: (patch: Partial<Workspace>) => void;
  keywordGap: KeywordGapResult | null;
  /** Null in cover-letter mode or until a job description is entered. */
  atsReport: AtsReport | null;
  /** Whether this document type gets an ATS score (resumes do, cover letters don't). */
  scoresAts: boolean;
  isGenerating: boolean;
  onFix: (fix: AtsFix) => void;
  onUsePrompt: (prompt: string) => void;
}

/**
 * The target job (company, role, description) and how well the document matches
 * it: one job description drives tailoring, keyword gaps, and the ATS score.
 */
export const JobMatchSection: React.FC<JobMatchSectionProps> = ({
  bare,
  workspace,
  onUpdate,
  keywordGap,
  atsReport,
  scoresAts,
  isGenerating,
  onFix,
  onUsePrompt,
}) => {
  const { targetCompany, targetRole, jobDescription } = workspace;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /** Fills the job description from a PDF/TXT/MD job posting. */
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    setImporting(file.name);
    try {
      const res = await extractTextFromFile(file);
      if (res.success && res.attachment) onUpdate({ jobDescription: res.attachment.text });
      else setImportError(res.error || `Could not read ${file.name}.`);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : `Could not read ${file.name}.`);
    } finally {
      setImporting(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const hasTarget = Boolean(targetCompany.trim() || targetRole.trim() || jobDescription.trim());
  const title = [targetCompany.trim(), targetRole.trim()].filter(Boolean).join(' · ');

  let summary: React.ReactNode;
  if (atsReport) {
    summary = (
      <span className="flex items-center gap-1.5 min-w-0">
        <Chip tone={scoreTone(atsReport.score)} title="Estimated ATS readiness for this job, out of 100">
          {atsReport.score} · {atsReport.rating}
        </Chip>
        <span className="truncate text-zinc-400">{title || 'Job description added'}</span>
      </span>
    );
  } else if (keywordGap && keywordGap.totalJdKeywords > 0) {
    summary = (
      <span className="flex items-center gap-1.5 min-w-0">
        <Chip tone={keywordGap.matchPercentage >= 75 ? 'success' : keywordGap.matchPercentage >= 50 ? 'warning' : 'danger'}>
          {keywordGap.matchPercentage}% keywords
        </Chip>
        <span className="truncate text-zinc-400">{title || 'Job description added'}</span>
      </span>
    );
  } else if (title) {
    summary = <span className="text-zinc-400">{title} · add the job description</span>;
  } else {
    summary = scoresAts ? 'Add a job to get your ATS score' : 'Add the job you’re applying for';
  }

  const keywordDetail = keywordGap ? <KeywordGapView result={keywordGap} onFillGaps={onUsePrompt} /> : null;

  return (
    <Collapsible
      bare={bare}
      icon={<Target className="w-3.5 h-3.5" />}
      title={scoresAts ? 'Job & ATS' : 'Target job'}
      summary={summary}
      actions={
        hasTarget ? (
          <button
            type="button"
            title="Clear job"
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
      <div
        className="relative"
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.types).includes('Files')) {
            e.preventDefault();
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files?.length) {
            e.preventDefault();
            setIsDragging(false);
            importFile(e.dataTransfer.files[0]);
          }
        }}
      >
      {isDragging && (
        <div className="absolute inset-0 z-10 rounded-lg border-2 border-dashed border-indigo-400 bg-surface-1/90 flex items-center justify-center text-[11px] font-semibold text-indigo-200 pointer-events-none">
          Drop the job posting (PDF, TXT, MD)
        </div>
      )}
      <textarea
        value={jobDescription}
        onChange={(e) => onUpdate({ jobDescription: e.target.value })}
        onPaste={(e) => {
          const file = e.clipboardData?.files?.[0];
          if (file) {
            e.preventDefault();
            importFile(file);
          }
        }}
        placeholder={
          scoresAts
            ? 'Paste the job description to get your ATS score and missing keywords…'
            : 'Paste the job description so the letter speaks to it…'
        }
        rows={3}
        aria-label="Job description"
        className={`${inputClass} resize-y min-h-[56px] max-h-48 leading-relaxed`}
      />
      </div>
      <div className="flex items-center gap-2 -mt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => importFile(e.target.files?.[0])}
        />
        <Button
          size="xs"
          variant="ghost"
          disabled={Boolean(importing)}
          onClick={() => fileInputRef.current?.click()}
          icon={importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
          title="Fill the job description from a PDF or text file (or drop / paste one on the box)"
        >
          {importing ? `Reading ${importing}…` : 'Import PDF or text file'}
        </Button>
        {importError && <span className="text-[10.5px] text-rose-300 truncate">{importError}</span>}
      </div>

      {atsReport ? (
        <div className="pt-1 border-t border-line">
          <AtsReportView report={atsReport} isGenerating={isGenerating} onFix={onFix} keywordDetail={keywordDetail} />
        </div>
      ) : (
        keywordDetail
      )}
    </Collapsible>
  );
};
