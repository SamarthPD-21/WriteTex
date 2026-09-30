import { useCallback, useEffect, useRef, useState } from 'react';

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Which edges a drag moves: the header moves the whole panel. */
export type DragMode = 'move' | 'left' | 'bottom' | 'bottom-left';

const STORAGE_KEY = 'writetex_panel_layout_v2';
const MARGIN = 12;
const MIN_WIDTH = 340;
const MAX_WIDTH = 720;
const MIN_HEIGHT = 420;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 660;

/** Keeps the rectangle fully on screen and within size limits. */
function fit(rect: PanelRect): PanelRect {
  const maxW = Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2);
  const maxH = window.innerHeight - MARGIN * 2;
  const width = Math.max(Math.min(MIN_WIDTH, maxW), Math.min(rect.width, maxW));
  const height = Math.max(Math.min(MIN_HEIGHT, maxH), Math.min(rect.height, maxH));
  return {
    width,
    height,
    x: Math.max(MARGIN, Math.min(rect.x, window.innerWidth - width - MARGIN)),
    y: Math.max(MARGIN, Math.min(rect.y, window.innerHeight - height - MARGIN)),
  };
}

function defaultRect(): PanelRect {
  const height = Math.min(DEFAULT_HEIGHT, window.innerHeight - MARGIN * 2);
  return fit({
    width: DEFAULT_WIDTH,
    height,
    x: window.innerWidth - DEFAULT_WIDTH - 24,
    y: window.innerHeight - height - 24,
  });
}

/**
 * Position and size of the floating panel. Resizing from the left edge keeps the
 * right edge where it is (the panel lives on the right of the screen), and
 * resizing from the bottom keeps the top fixed — the edge you drag is the edge
 * that moves.
 */
export function usePanelLayout() {
  const [rect, setRect] = useState<PanelRect>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && [saved.x, saved.y, saved.width, saved.height].every((n) => typeof n === 'number')) return fit(saved);
    } catch {
      // Fall back to the default placement
    }
    return defaultRect();
  });
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const start = useRef<{ mouseX: number; mouseY: number; rect: PanelRect }>({ mouseX: 0, mouseY: 0, rect });
  const latest = useRef(rect);
  latest.current = rect;

  const beginDrag = useCallback((mode: DragMode) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (mode === 'move' && target.closest('button, input, textarea, select, a')) return;
    e.preventDefault();
    e.stopPropagation();
    start.current = { mouseX: e.clientX, mouseY: e.clientY, rect: latest.current };
    setDragMode(mode);
  }, []);

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (e: MouseEvent) => {
      const { mouseX, mouseY, rect: r } = start.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      if (dragMode === 'move') {
        setRect(fit({ ...r, x: r.x + dx, y: r.y + dy }));
        return;
      }
      let { x, width, height } = r;
      if (dragMode === 'left' || dragMode === 'bottom-left') {
        const right = r.x + r.width;
        width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, r.width - dx, right - MARGIN));
        x = right - width;
      }
      if (dragMode === 'bottom' || dragMode === 'bottom-left') {
        height = Math.max(MIN_HEIGHT, Math.min(r.height + dy, window.innerHeight - r.y - MARGIN));
      }
      setRect({ x, y: r.y, width, height });
    };
    const onUp = () => {
      setDragMode(null);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current));
      } catch {
        // Ignore storage errors
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragMode]);

  useEffect(() => {
    const onResize = () => setRect((r) => fit(r));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const reset = useCallback(() => {
    const r = defaultRect();
    setRect(r);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
    } catch {
      // Ignore storage errors
    }
  }, []);

  return { rect, dragMode, beginDrag, reset };
}
