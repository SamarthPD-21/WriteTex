import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { KeywordGapResult } from '../../analysis/keyword-gap';
import { Button } from './ui';

interface KeywordGapViewProps {
  result: KeywordGapResult;
  onFillGaps: (prompt: string) => void;
}

const SHOWN = 10;

/** Missing and matched job-description keywords, with one action to address the gaps. */
export const KeywordGapView: React.FC<KeywordGapViewProps> = ({ result, onFillGaps }) => {
  const [showAll, setShowAll] = useState(false);
  if (result.totalJdKeywords === 0) return null;

  const missing = showAll ? result.missingKeywords : result.missingKeywords.slice(0, SHOWN);
  const chip = (kw: string, isMissing: boolean) => (
    <span
      key={kw}
      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono border ${
        isMissing ? 'bg-amber-500/10 text-amber-200 border-amber-400/20' : 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20'
      }`}
    >
      {kw}
    </span>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {result.missingKeywords.length > 0 ? (
        <>
          <div className="text-[10.5px] text-zinc-400">
            Missing <span className="text-zinc-500">· most important first</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {missing.map((kw) => chip(kw, true))}
            {result.missingKeywords.length > SHOWN && (
              <button type="button" onClick={() => setShowAll(!showAll)} className="px-1.5 text-[10px] text-zinc-400 hover:text-zinc-200">
                {showAll ? 'fewer' : `+${result.missingKeywords.length - SHOWN} more`}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-[10.5px] text-emerald-200">Every keyword from the job description is covered.</div>
      )}

      {result.matchedKeywords.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-[10.5px] text-zinc-500 hover:text-zinc-300">
            {result.matchedKeywords.length} already covered <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
          </summary>
          <div className="flex flex-wrap gap-1 mt-1">{result.matchedKeywords.map((kw) => chip(kw, false))}</div>
        </details>
      )}

      {result.missingKeywords.length > 0 && result.suggestedPrompt && (
        <Button size="sm" variant="secondary" onClick={() => onFillGaps(result.suggestedPrompt)} icon={<Sparkles className="w-3 h-3 text-indigo-300" />}>
          Draft a prompt to add them
        </Button>
      )}
    </div>
  );
};
