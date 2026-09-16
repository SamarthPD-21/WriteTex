import React, { useState } from 'react';
import { X, BookOpen, Copy, Check, Sparkles } from 'lucide-react';
import { LATEX_TEMPLATES, LaTeXTemplate } from '../../templates/latex-templates';
import { DocumentMode } from '../../messaging/types';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTemplate: (latex: string) => void;
  defaultCategory?: DocumentMode;
}

export const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  onInsertTemplate,
  defaultCategory = 'resume',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'resume' | 'cover_letter'>(
    defaultCategory
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<LaTeXTemplate>(LATEX_TEMPLATES[0]);

  if (!isOpen) return null;

  const filteredTemplates = LATEX_TEMPLATES.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const handleCopy = (t: LaTeXTemplate) => {
    navigator.clipboard.writeText(t.fullLatex);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (t: LaTeXTemplate) => {
    onInsertTemplate(t.fullLatex);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#171726] border border-border/90 rounded-2xl p-4 shadow-panel flex flex-col gap-3.5 max-h-[540px] ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle/80">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-accent/20 text-accent">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-white">LaTeX Template Library</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-[#10101a] rounded-xl border border-border/60">
          {(['all', 'resume', 'cover_letter'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              {cat === 'all' ? 'All' : cat === 'resume' ? '📄 Resumes' : '✉️ Cover Letters'}
            </button>
          ))}
        </div>

        {/* Template List */}
        <div className="flex flex-col gap-2.5 overflow-y-auto no-scrollbar max-h-[360px] pr-0.5">
          {filteredTemplates.map((template) => {
            const isSelected = activeTemplate.id === template.id;
            return (
              <div
                key={template.id}
                onClick={() => setActiveTemplate(template)}
                className={`flex flex-col gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1e1e30] border-accent shadow-sm ring-1 ring-accent/30'
                    : 'bg-[#12121e] border-border/60 hover:bg-[#161626]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-text-primary">{template.title}</span>
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 font-medium">
                        {template.badge}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-text-secondary leading-snug">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Snippet preview */}
                <div className="p-2 rounded-lg bg-[#0c0c14] border border-border/40 font-mono text-[10px] text-text-muted truncate select-text">
                  {template.previewSnippet}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(template);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-medium bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors border border-border/50"
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy LaTeX</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsert(template);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10.5px] font-semibold bg-accent hover:bg-accent-hover text-white shadow-sm transition-all active:scale-95"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Insert into Overleaf</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
