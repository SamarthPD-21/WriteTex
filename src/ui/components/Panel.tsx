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
      className="fixed top-0 left-0 z-[2147483647] max-w-[calc(100vw-24px)] bg-[#12121c]/98 border border-white/[0.08] rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-panel-in transition-[width] duration-75 select-none ring-1 ring-black/50"
    >
      {/* Left Edge Resize Grip */}
      {onMouseDownResize && (
        <div
          onMouseDown={onMouseDownResize}
          title="Drag to resize panel"
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-indigo-500/40 z-50 transition-colors group flex items-center justify-center"
        >
          <div className="w-0.5 h-10 rounded-full bg-white/20 group-hover:bg-indigo-400 transition-colors" />
        </div>
      )}

      {/* Draggable Header Bar */}
      <div
        onMouseDown={onMouseDownHeader}
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#171724]/90 border-b border-white/[0.06] cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          {/* Logo icon with glow */}
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <span className="font-bold text-xs tracking-tight text-white">WriteTex</span>

          <span className="text-[9.5px] font-mono px-1.5 py-0.5 bg-white/[0.06] text-zinc-400 rounded-md font-medium">
            v0.3.0
          </span>

          {/* Connected badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md text-[10px] text-zinc-400"
            title={isEditorConnected ? 'Connected to Overleaf CodeMirror 6' : 'Connecting to Overleaf...'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isEditorConnected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="font-mono text-[9px] font-medium">
              {isEditorConnected ? 'CM6' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-0.5">
          {/* Multi-Level Undo / Revert Button */}
          {undoCount > 0 && onUndo && (
            <button
              type="button"
              onClick={onUndo}
              title={`Undo last edit (${undoCount} available)`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all active:scale-95 text-[10.5px] font-medium mr-1"
            >
              <Undo2 className="w-3 h-3" />
              <span>{undoCount}</span>
            </button>
          )}

          {/* Template Library Button */}
          {onOpenTemplates && (
            <button
              type="button"
              onClick={onOpenTemplates}
              title="LaTeX Templates Library"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-95"
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
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Settings & Models */}
          <button
            type="button"
            onClick={onToggleSettings}
            title="Settings & Models (⚙)"
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-95 ${
              isSettingsOpen ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/30' : ''
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          {/* Minimize */}
          <button
            type="button"
            onClick={onMinimize}
            title="Minimize"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-95"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors active:scale-95"
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
