import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    category: 'General',
    keys: ['Ctrl', 'Shift', 'W'],
    description: 'Toggle WriteTex copilot panel from anywhere on Overleaf',
  },
  {
    category: 'General',
    keys: ['Esc'],
    description: 'Close panel or back to input view',
  },
  {
    category: 'Generation',
    keys: ['Ctrl', 'Enter'],
    description: 'Generate LaTeX edits or cover letter draft',
  },
  {
    category: 'Review & Diff',
    keys: ['Ctrl', 'Shift', 'Enter'],
    description: 'Apply diff changes directly into Overleaf document',
  },
  {
    category: 'History',
    keys: ['↑', '↓'],
    description: 'Cycle through previous prompts in input box',
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#181827] border border-border/90 rounded-2xl p-4 shadow-panel flex flex-col gap-3.5 ring-1 ring-white/10"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle/80">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-accent/20 text-accent">
              <Command className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-white">Keyboard Shortcuts</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto no-scrollbar pr-0.5">
          {SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-[#12121e] border border-border/60 text-xs"
            >
              <span className="text-[11px] text-text-secondary leading-snug flex-1 pr-2">
                {item.description}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-1.5 py-0.5 rounded-md bg-[#252538] border border-border/80 text-[10px] font-mono font-bold text-text-primary shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border-subtle/70 flex items-center justify-between text-[10.5px] text-text-muted">
          <span>Pro tip: Highlight code before pressing Ctrl+Enter</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-accent/20 hover:bg-accent/30 text-accent font-semibold rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
