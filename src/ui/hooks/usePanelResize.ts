import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'writetex_panel_width';
const DEFAULT_WIDTH = 410;
const MIN_WIDTH = 340;
const MAX_WIDTH = 640;

export interface UsePanelResizeReturn {
  width: number;
  isResizing: boolean;
  handleMouseDownResize: (e: React.MouseEvent) => void;
  resetWidth: () => void;
}

export function usePanelResize(): UsePanelResizeReturn {
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // Ignore local storage error
    }
    return DEFAULT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const handleMouseDownResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const resetWidth = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
    try {
      localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // The panel is on the right side of the screen, so dragging left increases width
      const deltaX = startXRef.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem(STORAGE_KEY, String(width));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width]);

  return {
    width,
    isResizing,
    handleMouseDownResize,
    resetWidth,
  };
}
