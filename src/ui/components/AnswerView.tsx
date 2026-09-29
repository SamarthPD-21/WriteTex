import React, { useState } from 'react';
import { ArrowLeft, Check, Copy, MessageSquare } from 'lucide-react';
import { Button } from './ui';

interface AnswerViewProps {
  prompt: string;
  answer: string;
  onBack: () => void;
  onFollowUp: () => void;
}

/** Answers to questions. Nothing here is ever written into the document. */
export const AnswerView: React.FC<AnswerViewProps> = ({ prompt, answer, onBack, onFollowUp }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5 p-3">
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-surface-2 border border-line">
        <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-indigo-300 shrink-0" />
        <div className="text-[11.5px] text-zinc-200 line-clamp-2">{prompt}</div>
      </div>
      <div className="flex-1 min-h-[160px] overflow-y-auto p-3 bg-surface-0 border border-line rounded-xl text-[12px] text-zinc-200 leading-relaxed whitespace-pre-wrap select-text no-scrollbar">
        {answer}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-line">
        <Button size="md" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back
        </Button>
        <Button
          size="md"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(answer).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        >
          Copy
        </Button>
        <Button size="md" variant="primary" className="flex-1" onClick={onFollowUp}>
          Ask a follow-up
        </Button>
      </div>
    </div>
  );
};
