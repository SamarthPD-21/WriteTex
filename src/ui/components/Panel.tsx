import React, { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, X, Undo2, MoreHorizontal, BookOpen, Keyboard, Maximize2 } from 'lucide-react';
import { DragMode, PanelRect } from '../hooks/usePanelLayout';
import { BrandMark } from './BrandMark';

interface PanelProps {
  isOpen: boolean;
  rect: PanelRect;
  dragMode: DragMode | null;
  beginDrag: (mode: DragMode) => (e: React.MouseEvent) => void;
  onResetLayout: () => void;
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
  onOpenShortcuts: () => void;
  onOpenTemplates: () => void;
  undoCount?: number;
  onUndo?: () => void;
  onClose: () => void;
  isEditorConnected?: boolean;
  children: React.ReactNode;
}

const iconButton =
  'w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60';

export const Panel: React.FC<PanelProps> = ({
  isOpen,
  rect,
  dragMode,
  beginDrag,
  onResetLayout,
  onToggleSettings,
  isSettingsOpen,
  onOpenShortcuts,
  onOpenTemplates,
  undoCount = 0,
  onUndo,
  onClose,
  isEditorConnected = true,
  children,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !e.composedPath().includes(menuRef.current)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (!isOpen) return null;

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setMenuOpen(false);
        onClick();
      }}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11.5px] text-zinc-200 hover:bg-white/[0.07] text-left"
    >
      <span className="text-zinc-400">{icon}</span>
      {label}
    </button>
  );

  return (
    <div
      role="dialog"
      aria-label="WriteTex"
      style={{
        transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
      className={`fixed top-0 left-0 z-[2147483647] bg-surface-1 border border-line-strong rounded-2xl shadow-panel flex flex-col overflow-hidden animate-panel-in select-none ring-1 ring-black/50 text-zinc-100 ${
        dragMode ? 'cursor-grabbing' : ''
      }`}
    >
      {/* Resize handles: the edge you drag is the edge that moves */}
      <div
        onMouseDown={beginDrag('left')}
        title="Drag to resize"
        className="absolute left-0 top-10 bottom-3 w-1.5 cursor-ew-resize z-50 group"
      >
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-12 w-1 rounded-full transition-colors ${dragMode === 'left' ? 'bg-indigo-400' : 'bg-transparent group-hover:bg-indigo-400/60'}`} />
      </div>
      <div onMouseDown={beginDrag('bottom')} title="Drag to resize" className="absolute bottom-0 left-3 right-0 h-1.5 cursor-ns-resize z-50 group">
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full transition-colors ${dragMode === 'bottom' ? 'bg-indigo-400' : 'bg-transparent group-hover:bg-indigo-400/60'}`} />
      </div>
      <div onMouseDown={beginDrag('bottom-left')} title="Drag to resize" className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize z-50" />

      {/* Header: drag to move */}
      <div
        onMouseDown={beginDrag('move')}
        onDoubleClick={onResetLayout}
        className="flex items-center gap-2 pl-3 pr-1.5 h-11 bg-surface-2 border-b border-line cursor-grab active:cursor-grabbing shrink-0"
      >
        <BrandMark size={24} className="shrink-0 drop-shadow-sm" />
        <span className="font-semibold text-[12.5px] tracking-tight">WriteTex</span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${isEditorConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}
          title={isEditorConnected ? 'Connected to the Overleaf editor' : 'Connecting to the Overleaf editor…'}
          aria-label={isEditorConnected ? 'Connected' : 'Connecting'}
        />

        <div className="ml-auto flex items-center gap-0.5">
          {undoCount > 0 && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!onUndo}
              title={`Undo the last WriteTex edit (${undoCount} available)`}
              className="flex items-center gap-1 h-7 px-2 mr-0.5 rounded-lg text-[11px] font-medium text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-50"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </button>
          )}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="More"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`${iconButton} ${menuOpen ? 'bg-white/[0.07] text-zinc-100' : ''}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-8 w-48 p-1 rounded-xl bg-surface-3 border border-line-strong shadow-panel z-[60] animate-panel-in">
                {menuItem(<BookOpen className="w-3.5 h-3.5" />, 'LaTeX templates', onOpenTemplates)}
                {menuItem(<Keyboard className="w-3.5 h-3.5" />, 'Keyboard shortcuts', onOpenShortcuts)}
                {menuItem(<Maximize2 className="w-3.5 h-3.5" />, 'Reset panel size', onResetLayout)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleSettings}
            title="Settings"
            aria-pressed={isSettingsOpen}
            className={`${iconButton} ${isSettingsOpen ? 'text-indigo-300 bg-indigo-500/15' : ''}`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClose} title="Close (Esc)" className={`${iconButton} hover:text-rose-200 hover:bg-rose-500/15`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
};
