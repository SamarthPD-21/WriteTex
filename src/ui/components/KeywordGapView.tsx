import React, { useState } from 'react';
import { Target, CheckCircle2, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { KeywordGapResult } from '../../analysis/keyword-gap';

interface KeywordGapViewProps {
  result: KeywordGapResult;
  onFillGaps: (prompt: string) => void;
  className?: string;
}

export const KeywordGapView: React.FC<KeywordGapViewProps> = ({
  result,
  onFillGaps,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'missing' | 'matched'>('missing');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (result.totalJdKeywords === 0) return null;

  const scoreColor =
    result.matchPercentage >= 75
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
      : result.matchPercentage >= 50
      ? 'text-amber-400 border-amber-500/40 bg-amber-950/40'
      : 'text-red-400 border-red-500/40 bg-red-950/40';

  const displayedKeywords =
    filter === 'missing'
      ? result.missingKeywords
      : filter === 'matched'
      ? result.matchedKeywords
      : [...result.missingKeywords, ...result.matchedKeywords];

  return (
    <div
      className={`flex flex-col gap-2 p-2.5 rounded-xl bg-[#141422] border border-border/80 shadow-sm animate-in fade-in duration-150 ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-bold text-[11px] text-text-primary">JD Keyword Matcher</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${scoreColor}`}>
            {result.matchPercentage}% Match
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-0.5 text-[10px] text-text-muted hover:text-text-primary transition-colors"
          >
            <span>{isExpanded ? 'Hide' : 'Show'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setFilter('missing')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                filter === 'missing'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-text-muted hover:text-text-secondary'
              }`}
            >
              <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
              <span>Missing ({result.missingKeywords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('matched')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                filter === 'matched'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-text-muted hover:text-text-secondary'
              }`}
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>Matched ({result.matchedKeywords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-white/5 text-text-muted hover:text-text-secondary'
              }`}
            >
              All ({result.totalJdKeywords})
            </button>
          </div>

          {/* Keyword tags */}
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar py-0.5">
            {displayedKeywords.length === 0 ? (
              <span className="text-[10px] text-text-muted italic py-1">
                {filter === 'missing'
                  ? '✓ Great job! All detected JD keywords are covered in your resume.'
                  : 'No keywords to display.'}
              </span>
            ) : (
              displayedKeywords.map((kw) => {
                const isMissing = result.missingKeywords.includes(kw);
                return (
                  <span
                    key={kw}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
                      isMissing
                        ? 'bg-amber-950/50 text-amber-300 border border-amber-800/60'
                        : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                    }`}
                  >
                    <span>{isMissing ? '✗' : '✓'}</span>
                    <span>{kw}</span>
                  </span>
                );
              })
            )}
          </div>

          {/* 1-Click Action to fill gaps */}
          {result.missingKeywords.length > 0 && result.suggestedPrompt && (
            <div className="pt-1 border-t border-border-subtle/60">
              <button
                type="button"
                onClick={() => onFillGaps(result.suggestedPrompt)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10.5px] font-semibold text-accent bg-accent/15 hover:bg-accent/25 border border-accent/30 transition-all active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-accent" />
                <span>Tailor Resume to Fill Missing Keywords ({result.missingKeywords.slice(0, 4).join(', ')})</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
