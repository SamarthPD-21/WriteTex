import React from 'react';
import { BrandMark } from './BrandMark';

interface FloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
  hasSelection: boolean;
}

/** Opens the panel. A green dot shows when text is selected in the editor. */
export const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick, isOpen, hasSelection }) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[2147483646] select-none">
      <button
        type="button"
        onClick={onClick}
        title="Open WriteTex (Ctrl+Shift+W)"
        className="group flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full bg-surface-2/95 border border-line-strong text-zinc-100 text-xs font-semibold shadow-panel hover:border-indigo-400/60 hover:bg-surface-3 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
      >
        <BrandMark size={24} className="transition-transform group-hover:scale-105" />
        <span>WriteTex</span>
        {hasSelection && (
          <span className="relative flex h-2 w-2" aria-label="Text selected">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        )}
      </button>
    </div>
  );
};
