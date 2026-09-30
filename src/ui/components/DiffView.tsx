import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Code2, Copy, Crosshair, Download, Edit3, FileCode, MapPin, X } from 'lucide-react';
import { computeDiff } from '../../diff/compute';
import { DiffLine } from '../../diff/types';
import { EditPlan } from '../../diff/edit-plan';
import { validateLatex } from '../../latex/validator';
import { latexToMarkdown, latexToPlainText, downloadSnippetAsFile } from '../../utils/export';
import { FinishReason } from '../hooks/useAI';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';
import { Button, Chip } from './ui';

interface DiffViewProps {
  fileName: string;
  /** Raw model output, shown when there is no plan. */
  output: string;
  plan: EditPlan | null;
  finishReason: FinishReason;
  onApply: () => void;
  onReject: () => void;
  onEdit: () => void;
  /** Re-targets the output at the current Overleaf selection. */
  onRelocate: () => void;
  hasSelection: boolean;
  isApplying?: boolean;
}

const CONTEXT_LINES = 3;

type Row = { kind: 'line'; line: DiffLine } | { kind: 'gap'; count: number };

/** Collapses long runs of unchanged lines so large diffs stay readable. */
function collapseUnchanged(lines: DiffLine[]): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].type !== 'unchanged') {
      rows.push({ kind: 'line', line: lines[i++] });
      continue;
    }
    let j = i;
    while (j < lines.length && lines[j].type === 'unchanged') j++;
    const run = lines.slice(i, j);
    const keepHead = i === 0 ? 0 : CONTEXT_LINES;
    const keepTail = j === lines.length ? 0 : CONTEXT_LINES;
    if (run.length > keepHead + keepTail + 1) {
      run.slice(0, keepHead).forEach((line) => rows.push({ kind: 'line', line }));
      rows.push({ kind: 'gap', count: run.length - keepHead - keepTail });
      run.slice(run.length - keepTail).forEach((line) => rows.push({ kind: 'line', line }));
    } else {
      run.forEach((line) => rows.push({ kind: 'line', line }));
    }
    i = j;
  }
  return rows;
}

export const DiffView: React.FC<DiffViewProps> = ({
  fileName,
  output,
  plan,
  finishReason,
  onApply,
  onReject,
  onEdit,
  onRelocate,
  hasSelection,
  isApplying = false,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmTruncated, setConfirmTruncated] = useState(false);
  // 'unknown' means the stream ended without a stop signal, which is as suspect as a cut-off
  const truncated = finishReason === 'truncated' || finishReason === 'unknown';
  const canApply = Boolean(plan) && (!truncated || confirmTruncated) && !isApplying;

  const diff = useMemo(() => {
    if (!plan) return null;
    // Include the indentation before the edit so the first line lines up with the rest
    const lead = plan.contextBefore.slice(plan.contextBefore.lastIndexOf('\n') + 1);
    const prefix = /^[ \t]*$/.test(lead) ? lead : '';
    return computeDiff(prefix + plan.originalText, prefix + plan.newText, fileName);
  }, [plan, fileName]);
  const rows = useMemo(() => (diff ? collapseUnchanged(diff.hunks.flatMap((h) => h.lines)) : []), [diff]);

  // Only flag LaTeX problems the edit introduces, not ones already in the document
  const newProblems = useMemo(() => {
    if (!plan) return [];
    const before = new Set(validateLatex(plan.originalText).errors.map((e) => e.replace(/^Line \d+: /, '')));
    return validateLatex(plan.newText)
      .errors.map((e) => e.replace(/^Line \d+: /, ''))
      .filter((e) => !before.has(e));
  }, [plan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter' && canApply) {
        e.preventDefault();
        onApply();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onApply, canApply]);

  const text = plan?.newText ?? output;
  const copy = (format: 'latex' | 'md' | 'txt') => {
    const content = format === 'md' ? latexToMarkdown(text) : format === 'txt' ? latexToPlainText(text) : text;
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(format);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5 p-3 select-text">
      {/* Where the edit lands */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-surface-2 border border-line">
        {plan ? <MapPin className="w-3.5 h-3.5 mt-0.5 text-indigo-300 shrink-0" /> : <Crosshair className="w-3.5 h-3.5 mt-0.5 text-amber-300 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-semibold text-zinc-100">
            {plan ? plan.description : 'Couldn’t find where this goes'}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-mono truncate">
            {plan
              ? `${fileName} · ${plan.startLine === plan.endLine ? `line ${plan.startLine}` : `lines ${plan.startLine}–${plan.endLine}`}`
              : 'Select the text to replace in Overleaf, then click “Use selection”.'}
          </div>
        </div>
        {diff && (
          <div className="flex items-center gap-1 shrink-0 font-mono">
            <Chip tone="success">+{diff.additions}</Chip>
            <Chip tone="danger">−{diff.deletions}</Chip>
          </div>
        )}
      </div>

      {plan && plan.confidence < 0.85 && plan.reason !== 'selection' && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10.5px] text-amber-100">
          <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
          Placement is a best guess — check the highlighted lines.
        </div>
      )}
      {truncated && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[10.5px] text-rose-100">
          <AlertTriangle className="w-3 h-3 text-rose-300 shrink-0" />
          <span className="flex-1">
            {finishReason === 'truncated'
              ? 'The model hit its output limit, so this is likely cut off.'
              : 'The response ended without a completion signal and may be cut off.'}
          </span>
          {!confirmTruncated && (
            <Button size="xs" variant="danger" onClick={() => setConfirmTruncated(true)}>
              Allow apply
            </Button>
          )}
        </div>
      )}
      {plan && plan.warnings.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[10.5px] text-rose-100">
          <AlertTriangle className="w-3 h-3 mt-0.5 text-rose-300 shrink-0" />
          <span>
            {plan.warnings.join(' ')} Select the part to replace and use “Use selection”, or edit before applying.
          </span>
        </div>
      )}
      {newProblems.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10.5px] text-amber-100">
          <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-300 shrink-0" />
          <span>This edit may not compile: {newProblems[0]}</span>
        </div>
      )}

      {/* Diff, or raw output when there is nothing to diff against */}
      <div className="flex-1 min-h-[160px] overflow-auto bg-surface-0 border border-line rounded-xl font-mono text-[11px] leading-relaxed no-scrollbar">
        {plan ? (
          rows.map((row, idx) =>
            row.kind === 'gap' ? (
              <div key={idx} className="px-3 py-0.5 text-[10px] text-zinc-500 bg-white/[0.02] border-y border-line select-none">
                ⋯ {row.count} unchanged lines
              </div>
            ) : (
              <DiffRow key={idx} line={row.line} />
            )
          )
        ) : (
          <pre className="p-3 whitespace-pre-wrap text-zinc-300">{output}</pre>
        )}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <Button size="xs" variant="ghost" onClick={() => copy('latex')} icon={copied === 'latex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Code2 className="w-3 h-3" />}>
          LaTeX
        </Button>
        <Button size="xs" variant="ghost" onClick={() => copy('md')} icon={copied === 'md' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}>
          Markdown
        </Button>
        <Button size="xs" variant="ghost" onClick={() => copy('txt')} icon={copied === 'txt' ? <Check className="w-3 h-3 text-emerald-400" /> : <FileCode className="w-3 h-3" />}>
          Plain
        </Button>
        <Button
          size="xs"
          variant="ghost"
          title="Download as .tex"
          onClick={() => downloadSnippetAsFile(`${fileName.replace(/\.[^/.]+$/, '') || 'writetex'}-edited.tex`, text, 'text/x-tex')}
          icon={<Download className="w-3 h-3" />}
        />
        <span className="ml-auto flex items-center gap-1">
          {hasSelection && (
            <Button size="xs" variant="ghost" title="Replace your current Overleaf selection instead" onClick={onRelocate} icon={<Crosshair className="w-3 h-3" />}>
              Use selection
            </Button>
          )}
          <Button size="xs" variant="ghost" onClick={onEdit} icon={<Edit3 className="w-3 h-3" />}>
            Edit
          </Button>
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-line">
        <Button size="md" onClick={onReject} disabled={isApplying} icon={<X className="w-3.5 h-3.5" />}>
          Discard
        </Button>
        <Button
          size="md"
          variant="primary"
          className="flex-1"
          onClick={onApply}
          disabled={!canApply}
          icon={<Check className="w-3.5 h-3.5" />}
        >
          {isApplying ? 'Applying…' : 'Apply to Overleaf'}
          <KeyboardShortcutHint shortcut="Ctrl+Shift+↵" variant="on-accent" className="hidden sm:inline-flex ml-0.5" />
        </Button>
      </div>
    </div>
  );
};

const DiffRow: React.FC<{ line: DiffLine }> = React.memo(({ line }) => {
  const isAdd = line.type === 'add';
  const isDel = line.type === 'delete';
  return (
    <div
      className={`flex items-start px-1.5 border-l-2 ${
        isAdd
          ? 'bg-emerald-500/[0.10] text-emerald-200 border-emerald-400'
          : isDel
          ? 'bg-rose-500/[0.10] text-rose-200 border-rose-500'
          : 'text-zinc-500 border-transparent'
      }`}
    >
      <span className={`w-4 shrink-0 select-none text-center ${isAdd ? 'text-emerald-400' : isDel ? 'text-rose-400' : 'text-zinc-700'}`}>
        {isAdd ? '+' : isDel ? '−' : ' '}
      </span>
      <span className="flex-1 whitespace-pre-wrap break-words">
        {line.wordParts && line.wordParts.length > 0
          ? line.wordParts.map((wp, i) => (
              <span
                key={i}
                className={
                  wp.type === 'add'
                    ? 'bg-emerald-400/25 text-emerald-50 rounded-sm'
                    : wp.type === 'delete'
                    ? 'bg-rose-400/25 text-rose-50 line-through rounded-sm'
                    : ''
                }
              >
                {wp.value}
              </span>
            ))
          : line.content || ' '}
      </span>
    </div>
  );
});
DiffRow.displayName = 'DiffRow';
