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
  isEditorConnected?: boolean;
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
  isEditorConnected = true,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-[2147483647] w-[390px] max-w-[calc(100vw-24px)] bg-[#171724]/95 border border-border/80 rounded-2xl shadow-panel backdrop-blur-2xl flex flex-col overflow-hidden animate-panel-in transition-shadow duration-200 select-none ring-1 ring-white/5"
    >
      {/* Draggable Header Bar */}
      <div
        onMouseDown={onMouseDownHeader}
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#1b1b2a]/90 border-b border-border-subtle/80 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-accent/25 text-accent shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs tracking-wide text-white">WriteTex</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white/10 text-white/70 rounded-md font-semibold">
            v0.2.0
          </span>

          <div
            className="flex items-center gap-1.5 px-2 py-0.5 bg-bg-tertiary/70 border border-border-subtle rounded-md text-[10px] text-text-secondary"
            title={isEditorConnected ? 'Connected to Overleaf CodeMirror 6' : 'Connecting to Overleaf...'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isEditorConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
              }`}
            ></span>
            <span className="font-mono text-[9.5px]">
              {isEditorConnected ? 'Overleaf CM6' : 'Connecting...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSettings}
            title="Settings & Models (⚙)"
            className={`p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/80 transition-colors active:scale-95 ${
              isSettingsOpen ? 'text-accent bg-accent/20 border border-accent/30' : ''
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onMinimize}
            title="Minimize"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/80 transition-colors active:scale-95"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg text-text-muted hover:text-red-300 hover:bg-red-950/40 transition-colors active:scale-95"
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
