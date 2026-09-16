import React, { useState, useEffect } from 'react';
import { Check, X, Edit3, FileCode, Download, Copy, FileText, Code2 } from 'lucide-react';
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
      {/* 1. Header with file and changes stats */}
      <div className="flex items-center justify-between text-xs bg-[#141422] border border-border/80 px-3 py-2 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 truncate">
          <FileCode className="w-4 h-4 text-accent shrink-0" />
          <span className="font-mono font-medium text-text-primary text-[12px] truncate">{fileName}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
          <span className="text-[#4ade80] font-semibold">+{diffResult.additions}</span>
          <span className="text-text-muted">·</span>
          <span className="text-[#f87171] font-semibold">-{diffResult.deletions}</span>
        </div>
      </div>

      {/* 2. Unified Diff Container */}
      <div className="flex-1 min-h-[160px] max-h-[320px] overflow-y-auto overflow-x-auto p-2 bg-[#0f0f18] border border-border/90 rounded-xl font-mono text-[11px] leading-relaxed">
        {diffResult.hunks.map((hunk, hIdx) => (
          <div key={hIdx} className="flex flex-col">
            {hunk.lines.map((line, lIdx) => {
              const isAdd = line.type === 'add';
              const isDel = line.type === 'delete';

              return (
                <div
                  key={lIdx}
                  className={`flex items-start px-2 py-0.5 rounded-[3px] my-[1px] ${
                    isAdd
                      ? 'bg-[#133524]/70 text-[#4ade80]'
                      : isDel
                      ? 'bg-[#3a171c]/70 text-[#f87171]'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {/* Diff prefix indicator */}
                  <span className="w-4 shrink-0 select-none font-bold opacity-75">
                    {isAdd ? '+' : isDel ? '-' : ' '}
                  </span>

                  {/* Diff line text with word-level highlight if available */}
                  <span className="flex-1 whitespace-pre-wrap break-all">
                    {line.wordParts && line.wordParts.length > 0 ? (
                      line.wordParts.map((wp, wpIdx) => (
                        <span
                          key={wpIdx}
                          className={
                            wp.type === 'add'
                              ? 'bg-[#22673f] text-emerald-200 px-0.5 rounded'
                              : wp.type === 'delete'
                              ? 'bg-[#6b252f] text-red-200 line-through px-0.5 rounded'
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

      {/* 3. Export Bar & Edit Trigger */}
      <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] text-text-muted mr-1">Export:</span>
          <button
            type="button"
            onClick={() => handleCopy('latex')}
            title="Copy raw LaTeX snippet"
            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary text-[10px] font-mono flex items-center gap-1 transition-colors"
          >
            {copiedFormat === 'latex' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            <span>LaTeX</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy('md')}
            title="Copy as Markdown format"
            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary text-[10px] font-mono flex items-center gap-1 transition-colors"
          >
            {copiedFormat === 'md' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <FileText className="w-2.5 h-2.5" />}
            <span>Markdown</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy('txt')}
            title="Copy as clean Plain Text"
            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary text-[10px] font-mono flex items-center gap-1 transition-colors"
          >
            {copiedFormat === 'txt' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Code2 className="w-2.5 h-2.5" />}
            <span>Plain Text</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download .tex snippet file"
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-light transition-colors font-medium"
        >
          <Edit3 className="w-3 h-3" />
          <span>Edit before applying</span>
        </button>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex items-center justify-between pt-1 gap-2 border-t border-border-subtle/60">
        <button
          type="button"
          onClick={onReject}
          disabled={isApplying}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary bg-[#161622] hover:bg-[#1f1f2e] border border-border/80 transition-colors active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          <span>Reject</span>
        </button>

        <button
          type="button"
          onClick={onApply}
          disabled={isApplying}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-accent hover:bg-accent-hover shadow-md transition-all active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply to Overleaf</span>
          <KeyboardShortcutHint shortcut="Ctrl+Shift+Enter" className="ml-1 opacity-75 hidden sm:inline-flex" />
        </button>
      </div>
    </div>
  );
};
