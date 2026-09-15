import React, { useState } from 'react';
import { Check, ArrowLeft } from 'lucide-react';

interface EditViewProps {
  initialText: string;
  onSaveAndApply: (editedText: string) => void;
  onCancel: () => void;
}

export const EditView: React.FC<EditViewProps> = ({
  initialText,
  onSaveAndApply,
  onCancel,
}) => {
  const [text, setText] = useState(initialText);

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center justify-between text-xs pb-1 border-b border-border-subtle">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to diff</span>
        </button>
        <span className="font-medium text-text-primary text-[11px]">Manual adjustment</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 min-h-[220px] p-3 bg-[#12121b] border border-border rounded-xl font-mono text-xs text-text-primary leading-relaxed resize-none outline-none focus:border-accent"
      />

      <div className="flex items-center justify-between pt-1 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-tertiary border border-border transition-colors"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => onSaveAndApply(text)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent-hover shadow-md transition-all active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply edited LaTeX</span>
        </button>
      </div>
    </div>
  );
};
