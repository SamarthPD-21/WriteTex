import React, { useState } from 'react';
import { ArrowUpRight, Check, Clock, Copy, GitCompare, Trash2 } from 'lucide-react';
import { HistoryItem } from '../hooks/useWorkspace';
import { Button, Chip, Collapsible, formatRelativeTime } from './ui';

interface HistorySectionProps {
  history: HistoryItem[];
  onReuse: (prompt: string) => void;
  onReview: (item: HistoryItem) => void;
  onClear: () => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({ history, onReuse, onReview, onClear }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (history.length === 0) return null;

  const copy = (item: HistoryItem) => {
    navigator.clipboard.writeText(item.output).catch(() => {});
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <Collapsible
      icon={<Clock className="w-3.5 h-3.5" />}
      title="History"
      summary={`${history.length} ${history.length === 1 ? 'request' : 'requests'} · last ${formatRelativeTime(history[0].timestamp)}`}
      actions={
        <button
          type="button"
          title="Clear history"
          onClick={onClear}
          className="p-1 rounded-md text-zinc-500 hover:text-rose-300 hover:bg-white/10"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      }
    >
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto no-scrollbar">
        {history.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <div key={item.id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface-1 border border-line">
              <div className="flex items-center gap-1.5 min-w-0">
                <Chip tone={item.kind === 'answer' ? 'accent' : 'neutral'}>
                  {item.kind === 'answer' ? 'Answer' : item.docMode === 'cover_letter' ? 'Letter' : 'Resume'}
                </Chip>
                <span className="text-[11px] font-medium text-zinc-200 truncate" title={item.prompt}>
                  {item.prompt}
                </span>
                <span className="ml-auto text-[9.5px] font-mono text-zinc-500 shrink-0">{formatRelativeTime(item.timestamp)}</span>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : item.id)}
                className={`text-left font-mono text-[10px] text-zinc-400 bg-surface-0 p-1.5 rounded-md whitespace-pre-wrap select-text ${
                  expanded ? 'max-h-52 overflow-y-auto' : 'line-clamp-2'
                }`}
              >
                {item.output}
              </button>
              <div className="flex items-center gap-1 justify-end">
                <Button size="xs" variant="ghost" onClick={() => onReuse(item.prompt)} icon={<ArrowUpRight className="w-2.5 h-2.5" />}>
                  Reuse prompt
                </Button>
                {item.kind === 'edit' && (
                  <Button size="xs" onClick={() => onReview(item)} icon={<GitCompare className="w-2.5 h-2.5" />}>
                    Review & apply
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  title="Copy output"
                  onClick={() => copy(item)}
                  icon={copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
};
