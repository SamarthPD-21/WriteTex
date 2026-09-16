import React, { useState } from 'react';
import { FileAttachment } from '../../integrations/files/types';
import { FileText, X, Eye, Sparkles, Check, Loader2 } from 'lucide-react';

interface FileAttachmentListProps {
  attachments: FileAttachment[];
  onRemoveAttachment: (id: string) => void;
  onUseAsJobDescription?: (text: string, fileName: string) => void;
  isExtracting?: boolean;
  extractingFileName?: string;
}

export const FileAttachmentList: React.FC<FileAttachmentListProps> = ({
  attachments,
  onRemoveAttachment,
  onUseAsJobDescription,
  isExtracting,
  extractingFileName,
}) => {
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [appliedJdId, setAppliedJdId] = useState<string | null>(null);

  if (attachments.length === 0 && !isExtracting) {
    return null;
  }

  const handleApplyJd = (att: FileAttachment) => {
    if (onUseAsJobDescription) {
      onUseAsJobDescription(att.text, att.name);
      setAppliedJdId(att.id);
      setTimeout(() => setAppliedJdId(null), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* List of Chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {attachments.map((att) => {
          const isPdf = att.type === 'pdf';
          return (
            <div
              key={att.id}
              className={`group flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg border text-xs shadow-xs transition-all ${
                isPdf
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
              }`}
            >
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setPreviewAttachment(att)}>
                {isPdf ? (
                  <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider">
                    PDF
                  </span>
                ) : (
                  <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-blue-500/20 text-blue-300 uppercase tracking-wider">
                    TXT
                  </span>
                )}

                <span
                  className="max-w-[130px] sm:max-w-[180px] font-medium text-[11px] truncate text-zinc-200 hover:text-white"
                  title={att.name}
                >
                  {att.name}
                </span>

                <span className="text-[10px] text-zinc-400 font-mono">
                  ({att.formattedSize}
                  {att.pageCount ? ` · ${att.pageCount}p` : ''})
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 ml-1">
                {/* 1-Click Set as JD if applicable */}
                {onUseAsJobDescription && att.isJobDescriptionCandidate && (
                  <button
                    type="button"
                    onClick={() => handleApplyJd(att)}
                    title="Populate Target Job Description and run Keyword Gap Analysis"
                    className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition-all active:scale-95"
                  >
                    {appliedJdId === att.id ? (
                      <>
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-emerald-400">Set as JD</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                        <span>Set as JD</span>
                      </>
                    )}
                  </button>
                )}

                {/* Preview button */}
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(att)}
                  title="Preview extracted text"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.id)}
                  title="Remove attachment"
                  className="p-1 rounded text-zinc-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Loading indicator if extracting */}
        {isExtracting && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span className="text-[11px]">
              Extracting text{extractingFileName ? ` from ${extractingFileName}` : ''}...
            </span>
          </div>
        )}
      </div>

      {/* Extracted Text Preview Modal / Popover */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-[#141422] border border-white/[0.12] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3 bg-[#181829] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-semibold text-xs text-zinc-100 truncate">
                  {previewAttachment.name}
                </span>
                <span className="text-[10.5px] text-zinc-400 font-mono shrink-0">
                  ({previewAttachment.formattedSize}
                  {previewAttachment.pageCount ? ` · ${previewAttachment.pageCount} pages` : ''} ·{' '}
                  {previewAttachment.wordCount.toLocaleString()} words)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap select-text bg-[#0d0d17]">
              {previewAttachment.text}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-[#181829] border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-[10.5px] text-zinc-400">
                {previewAttachment.charCount.toLocaleString()} characters extracted
              </span>

              <div className="flex items-center gap-2">
                {onUseAsJobDescription && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyJd(previewAttachment);
                      setPreviewAttachment(null);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                  >
                    Use as Target Job Description
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
