import React, { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle2, Wand2, X, Zap } from 'lucide-react';
import { OverleafDiagnosticsResult, scrapeOverleafErrors } from '../../adapters/overleaf/error-scraper';
import { autoRepairLatexDocument } from '../../latex/auto-repair';
import { validateLatex } from '../../latex/validator';
import { Button, Chip } from './ui';

interface DiagnosticsCardProps {
  fileName: string;
  fileContent: string;
  /** Bumped by the parent to request a fresh scan (e.g. the "Fix LaTeX" button). */
  scanRequest: number;
  isGenerating: boolean;
  onFixWithAI: (diagnostics: OverleafDiagnosticsResult) => void;
  onAutoRepair: () => void;
}

/** Surfaces Overleaf compile errors with one-click fixes. Hidden when the build is clean. */
/** Problems visible in the file itself, for when the Overleaf log has nothing yet. */
function scanFile(fileContent: string): OverleafDiagnosticsResult | null {
  if (!fileContent.trim()) return null;
  const repairs = autoRepairLatexDocument(fileContent).repairsMade;
  const structural = fileContent.includes('\\begin{document}') ? validateLatex(fileContent).errors : [];
  const issues = [...structural, ...repairs];
  if (issues.length === 0) return null;
  return {
    hasErrors: true,
    hasNoPdf: false,
    entries: issues.map((title) => ({ type: 'error' as const, title, message: title })),
    summary: 'Found problems in this file that will likely break compilation.',
  };
}

export const DiagnosticsCard: React.FC<DiagnosticsCardProps> = ({
  fileName,
  fileContent,
  scanRequest,
  isGenerating,
  onFixWithAI,
  onAutoRepair,
}) => {
  const [diagnostics, setDiagnostics] = useState<OverleafDiagnosticsResult | null>(null);
  const [showClean, setShowClean] = useState(false);

  useEffect(() => {
    const logResult = scrapeOverleafErrors();
    const hasLogProblems = logResult.hasErrors || logResult.hasNoPdf;
    // Manual scans also inspect the file text itself
    const result = hasLogProblems ? logResult : scanRequest > 0 ? scanFile(fileContent) : null;
    setDiagnostics(result);
    // A manual scan with nothing found gets a brief confirmation
    if (scanRequest > 0 && !result) {
      setShowClean(true);
      const timer = setTimeout(() => setShowClean(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [fileName, scanRequest]);

  if (showClean && !diagnostics) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200 animate-panel-in">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        No compile errors found in the Overleaf log or this file.
      </div>
    );
  }
  if (!diagnostics) return null;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 animate-panel-in">
      <div className="flex items-start gap-2">
        <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-rose-100">
            {diagnostics.hasNoPdf ? 'Compile failed' : 'Compile errors'}
            {diagnostics.hasNoPdf && <Chip tone="danger">No PDF</Chip>}
          </div>
          <div className="text-[10.5px] text-zinc-400">{diagnostics.summary}</div>
        </div>
        <button
          type="button"
          title="Dismiss"
          onClick={() => setDiagnostics(null)}
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {diagnostics.entries.length > 0 && (
        <ul className="flex flex-col gap-0.5 max-h-24 overflow-y-auto bg-black/30 p-2 rounded-lg font-mono text-[10.5px] text-rose-200/90">
          {diagnostics.entries.slice(0, 4).map((entry, idx) => (
            <li key={idx} className="truncate" title={entry.message}>
              {entry.line ? <span className="text-rose-400">L{entry.line} </span> : null}
              {entry.title}
            </li>
          ))}
          {diagnostics.entries.length > 4 && (
            <li className="text-zinc-500 italic">+{diagnostics.entries.length - 4} more in the Overleaf log</li>
          )}
        </ul>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="success" className="flex-1" onClick={onAutoRepair} icon={<Wand2 className="w-3 h-3" />}>
          Quick repair
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="flex-1"
          disabled={isGenerating}
          onClick={() => onFixWithAI(diagnostics)}
          icon={<Zap className="w-3 h-3" />}
        >
          Fix with AI
        </Button>
      </div>
    </div>
  );
};
