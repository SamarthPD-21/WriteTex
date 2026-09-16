import React, { useState, useEffect } from 'react';
import { Check, X, Edit3, FileCode, Download, FileText, Code2, AlignLeft, CheckCircle2 } from 'lucide-react';
import { DiffResult } from '../../diff/types';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';
import { latexToPlainText, latexToMarkdown, downloadSnippetAsFile } from '../../utils/export';

interface DiffViewProps {
  fileName: string;
  diffResult: DiffResult;
  onApply: () => void;
  onReject: () => void;
  onEdit: () => void;
  isApplying?: boolean;
}

export const DiffView: React.FC<DiffViewProps> = ({
  fileName,
  diffResult,
  onApply,
  onReject,
  onEdit,
  isApplying = false,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Shortcut: Ctrl+Shift+Enter to apply, Escape to reject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        onApply();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onApply]);

  const handleCopy = (format: 'latex' | 'md' | 'txt') => {
    let content = diffResult.replacement;
    if (format === 'md') {
      content = latexToMarkdown(diffResult.replacement);
    } else if (format === 'txt') {
      content = latexToPlainText(diffResult.replacement);
    }

    navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownload = () => {
    const safeName = fileName.replace(/\.[^/.]+$/, '') || 'writetex-snippet';
    downloadSnippetAsFile(`${safeName}-edited.tex`, diffResult.replacement, 'text/x-tex');
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 select-text">
      {/* 1. Header with file badge and change stats */}
      <div className="flex items-center justify-between text-xs bg-[#141422] border border-white/[0.08] px-3.5 py-2.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 truncate">
          <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-mono font-medium text-zinc-100 text-[12px] truncate">{fileName}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
            +{diffResult.additions}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30">
            -{diffResult.deletions}
          </span>
        </div>
      </div>

      {/* 2. Unified Diff Container (Continuous code viewer, no brick margins) */}
      <div className="flex-1 min-h-[170px] max-h-[330px] overflow-y-auto overflow-x-auto bg-[#0a0a12] border border-white/[0.08] rounded-xl font-mono text-[11px] leading-relaxed shadow-inner no-scrollbar">
        {diffResult.hunks.map((hunk, hIdx) => (
          <div key={hIdx} className="flex flex-col">
            {hunk.lines.map((line, lIdx) => {
              const isAdd = line.type === 'add';
              const isDel = line.type === 'delete';

              return (
                <div
                  key={lIdx}
                  className={`flex items-start px-2 py-0.5 border-l-2 transition-colors ${
                    isAdd
                      ? 'bg-emerald-500/[0.12] text-emerald-300 border-emerald-400'
                      : isDel
                      ? 'bg-rose-500/[0.12] text-rose-300 border-rose-500'
                      : 'text-zinc-400 border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Diff prefix gutter */}
                  <span
                    className={`w-5 shrink-0 select-none font-bold text-center ${
                      isAdd ? 'text-emerald-400' : isDel ? 'text-rose-400' : 'text-zinc-600'
                    }`}
                  >
                    {isAdd ? '+' : isDel ? '-' : ' '}
                  </span>

                  {/* Diff line text with word-level highlight */}
                  <span className="flex-1 whitespace-pre-wrap break-all">
                    {line.wordParts && line.wordParts.length > 0 ? (
                      line.wordParts.map((wp, wpIdx) => (
                        <span
                          key={wpIdx}
                          className={
                            wp.type === 'add'
                              ? 'bg-emerald-400/25 text-emerald-100 rounded px-1 py-0.2'
                              : wp.type === 'delete'
                              ? 'bg-rose-400/25 text-rose-100 line-through rounded px-1 py-0.2'
                              : ''
                          }
                        >
                          {wp.value}
                        </span>
                      ))
                    ) : (
                      line.content || ' '
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 3. Export Toolbar & Edit Trigger */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] text-zinc-400 font-medium mr-0.5">Export:</span>

          <button
            type="button"
            onClick={() => handleCopy('latex')}
            title="Copy raw LaTeX snippet"
            className="h-6 px-2 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[10.5px] font-mono flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            {copiedFormat === 'latex' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Code2 className="w-3 h-3" />}
            <span>LaTeX</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy('md')}
            title="Copy as Markdown format"
            className="h-6 px-2 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[10.5px] font-mono flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            {copiedFormat === 'md' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <FileText className="w-3 h-3" />}
            <span>Markdown</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy('txt')}
            title="Copy as clean Plain Text"
            className="h-6 px-2 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[10.5px] font-mono flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            {copiedFormat === 'txt' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlignLeft className="w-3 h-3" />}
            <span>Plain</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download .tex snippet file"
            className="h-6 w-6 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium shrink-0 ml-2"
        >
          <Edit3 className="w-3 h-3" />
          <span>Edit</span>
        </button>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={isApplying}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-all active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          <span>Reject</span>
        </button>

        <button
          type="button"
          onClick={onApply}
          disabled={isApplying}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply to Overleaf</span>
          <KeyboardShortcutHint
            shortcut="Ctrl+Shift+↵"
            variant="on-accent"
            className="hidden sm:inline-flex"
          />
        </button>
      </div>
    </div>
  );
};
