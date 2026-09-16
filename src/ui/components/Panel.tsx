import React from 'react';
import { Sparkles, Settings as SettingsIcon, Minus, X, BookOpen, HelpCircle, Undo2 } from 'lucide-react';
import { Position } from '../hooks/usePanelPosition';

interface PanelProps {
  isOpen: boolean;
  position: Position;
  width?: number;
  onMouseDownHeader: (e: React.MouseEvent) => void;
  onMouseDownResize?: (e: React.MouseEvent) => void;
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
  onOpenShortcuts?: () => void;
  onOpenTemplates?: () => void;
  undoCount?: number;
  onUndo?: () => void;
  onMinimize: () => void;
  onClose: () => void;
  isEditorConnected?: boolean;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  isOpen,
  position,
  width = 410,
  onMouseDownHeader,
  onMouseDownResize,
  onToggleSettings,
  isSettingsOpen,
  onOpenShortcuts,
  onOpenTemplates,
  undoCount = 0,
  onUndo,
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
        width: `${width}px`,
      }}
      className="fixed top-0 left-0 z-[2147483647] max-w-[calc(100vw-24px)] bg-[#171724]/98 border border-border/80 rounded-2xl shadow-panel backdrop-blur-2xl flex flex-col overflow-hidden animate-panel-in transition-[width] duration-75 select-none ring-1 ring-white/10"
    >
      {/* Left Edge Resize Grip */}
      {onMouseDownResize && (
        <div
          onMouseDown={onMouseDownResize}
          title="Drag to resize panel"
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-accent/40 z-50 transition-colors group flex items-center justify-center"
        >
          <div className="w-0.5 h-10 rounded-full bg-white/20 group-hover:bg-accent transition-colors" />
        </div>
      )}

      {/* Draggable Header Bar */}
      <div
        onMouseDown={onMouseDownHeader}
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#1b1b2a]/95 border-b border-border-subtle/80 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-accent/25 text-accent shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs tracking-wide text-white">WriteTex</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white/10 text-white/70 rounded-md font-semibold">
            v0.3.0
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

        <div className="flex items-center gap-0.5">
          {/* Multi-Level Undo / Revert Button */}
          {undoCount > 0 && onUndo && (
            <button
              type="button"
              onClick={onUndo}
              title={`Undo last edit (${undoCount} available)`}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 transition-all active:scale-95 text-[10px] font-semibold mr-1"
            >
              <Undo2 className="w-3 h-3" />
              <span>Undo ({undoCount})</span>
            </button>
          )}

          {/* Template Library Button */}
          {onOpenTemplates && (
            <button
              type="button"
              onClick={onOpenTemplates}
              title="LaTeX Templates Library"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/80 transition-colors active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Shortcuts Help Button */}
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts (?)"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/80 transition-colors active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Settings & Models */}
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

          {/* Minimize */}
          <button
            type="button"
            onClick={onMinimize}
            title="Minimize"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/80 transition-colors active:scale-95"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
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
