import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Sparkles, Square, Wand2, X } from 'lucide-react';
import { AIProviderId, Settings } from '../../messaging/types';
import { FileAttachment } from '../../integrations/files/types';
import { extractTextFromFile } from '../../integrations/files/extractor';
import { FileAttachmentList } from './FileAttachmentList';
import { ModelSelector } from './ModelSelector';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';
import { Button } from './ui';

interface PromptComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  placeholder: string;
  canSubmit: boolean;
  onSubmit: () => void;
  isGenerating: boolean;
  onStop: () => void;
  /** Past prompts, newest first, for ↑/↓ recall. */
  recentPrompts: string[];
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  onUseAsJobDescription: (text: string) => void;
  settings: Settings;
  onSelectModel: (provider: AIProviderId, model: string) => void;
  onFixLatex: () => void;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  prompt,
  onPromptChange,
  placeholder,
  canSubmit,
  onSubmit,
  isGenerating,
  onStop,
  recentPrompts,
  attachments,
  onAttachmentsChange,
  onUseAsJobDescription,
  settings,
  onSelectModel,
  onFixLatex,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recallIndex, setRecallIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [extractingName, setExtractingName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const addFiles = async (files: FileList | File[]) => {
    setFileError(null);
    const added: FileAttachment[] = [];
    for (const file of Array.from(files)) {
      setExtractingName(file.name);
      try {
        const res = await extractTextFromFile(file);
        if (res.success && res.attachment) added.push(res.attachment);
        else if (res.error) setFileError(res.error);
      } catch (err: unknown) {
        setFileError(err instanceof Error ? err.message : `Failed to read ${file.name}`);
      }
    }
    setExtractingName(null);
    if (added.length > 0) onAttachmentsChange([...attachments, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) onSubmit();
      setRecallIndex(-1);
      return;
    }
    // ↑ on an empty box (or while recalling) walks back through past prompts
    if (e.key === 'ArrowUp' && (prompt === '' || recallIndex !== -1) && recentPrompts.length > 0) {
      e.preventDefault();
      const next = Math.min(recallIndex + 1, recentPrompts.length - 1);
      setRecallIndex(next);
      onPromptChange(recentPrompts[next]);
    } else if (e.key === 'ArrowDown' && recallIndex !== -1) {
      e.preventDefault();
      const next = recallIndex - 1;
      setRecallIndex(next);
      onPromptChange(next === -1 ? '' : recentPrompts[next]);
    }
  };

  const hasApiKey = Boolean(settings.apiKeys[settings.provider]?.trim());

  return (
    <div className="px-3 pt-2.5 pb-3 bg-surface-1 border-t border-line flex flex-col gap-2 shrink-0">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={`relative flex flex-col rounded-xl bg-surface-0 border transition-colors ${
          isDragging ? 'border-indigo-400 ring-2 ring-indigo-500/30' : 'border-line focus-within:border-indigo-500/60'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 rounded-xl bg-surface-1/90 border-2 border-dashed border-indigo-400 flex items-center justify-center gap-2 text-[11px] font-semibold text-indigo-200 pointer-events-none">
            <Paperclip className="w-4 h-4" />
            Drop PDF, TXT, MD, or TEX files
          </div>
        )}

        {(attachments.length > 0 || extractingName) && (
          <div className="px-2.5 pt-2">
            <FileAttachmentList
              attachments={attachments}
              onRemoveAttachment={(id) => onAttachmentsChange(attachments.filter((a) => a.id !== id))}
              onUseAsJobDescription={(text) => onUseAsJobDescription(text)}
              isExtracting={Boolean(extractingName)}
              extractingFileName={extractingName || ''}
            />
          </div>
        )}
        {fileError && (
          <div className="mx-2.5 mt-2 px-2 py-1 rounded-md bg-rose-500/15 text-rose-200 text-[10.5px] flex items-center justify-between">
            <span>{fileError}</span>
            <button type="button" onClick={() => setFileError(null)} className="p-0.5 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            onPromptChange(e.target.value);
            setRecallIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={isGenerating}
          aria-label="Instruction for WriteTex"
          className="w-full px-3 pt-2.5 pb-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 text-xs resize-none outline-none leading-relaxed"
        />

        <div className="flex items-center gap-1 px-2 pb-1.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.md,.tex,text/plain,application/pdf"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />
          <Button
            size="xs"
            variant="ghost"
            title="Attach reference files (job description, old resume, notes)"
            onClick={() => fileInputRef.current?.click()}
            icon={<Paperclip className="w-3 h-3" />}
          >
            Attach
          </Button>
          <Button size="xs" variant="ghost" title="Check the Overleaf log and repair broken LaTeX" onClick={onFixLatex} icon={<Wand2 className="w-3 h-3" />}>
            Fix LaTeX
          </Button>
          {prompt && (
            <Button size="xs" variant="ghost" title="Clear" onClick={() => onPromptChange('')} icon={<X className="w-3 h-3" />} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ModelSelector selectedModel={settings.model} onSelectModel={onSelectModel} />
        {isGenerating ? (
          <Button variant="danger" size="md" className="ml-auto" onClick={onStop} icon={<Square className="w-3 h-3 fill-current" />}>
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            className="ml-auto"
            disabled={!canSubmit || !hasApiKey}
            title={hasApiKey ? undefined : 'Add an API key in Settings first'}
            onClick={onSubmit}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Generate
            <KeyboardShortcutHint shortcut="Ctrl+↵" variant="on-accent" className="ml-0.5" />
          </Button>
        )}
      </div>
    </div>
  );
};
