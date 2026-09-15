import React from 'react';
import { Sparkles, Settings as SettingsIcon, Minus, X } from 'lucide-react';
import { Position } from '../hooks/usePanelPosition';

interface PanelProps {
  isOpen: boolean;
  position: Position;
  onMouseDownHeader: (e: React.MouseEvent) => void;
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
  onMinimize: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  isOpen,
  position,
  onMouseDownHeader,
  onToggleSettings,
  isSettingsOpen,
  onMinimize,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-[2147483647] w-[385px] max-w-[calc(100vw-20px)] bg-bg-primary/95 border border-border rounded-2xl shadow-panel backdrop-blur-xl flex flex-col overflow-hidden animate-panel-in transition-shadow duration-200 select-none"
    >
      {/* Draggable Header Bar */}
      <div
        onMouseDown={onMouseDownHeader}
        className="flex items-center justify-between px-3.5 py-2.5 bg-bg-secondary/80 border-b border-border-subtle cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-accent/20 text-accent">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide text-white">WriteTex</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-bg-tertiary text-text-muted rounded">
            Overleaf AI
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSettings}
            title="Settings & API Keys"
            className={`p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors ${
              isSettingsOpen ? 'text-accent bg-accent/15' : ''
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onMinimize}
            title="Minimize"
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main View Container */}
      <div className="relative flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
};
