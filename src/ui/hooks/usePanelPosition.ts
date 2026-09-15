import { useState, useEffect, useCallback, useRef } from 'react';

export interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = 'writetex_panel_pos';

export function usePanelPosition(panelWidth = 380, panelHeight = 520) {
  // Initialize to bottom-right corner
  const [position, setPosition] = useState<Position>(() => {
    const defaultX = Math.max(20, window.innerWidth - panelWidth - 24);
    const defaultY = Math.max(20, window.innerHeight - panelHeight - 24);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          x: Math.min(Math.max(10, parsed.x), window.innerWidth - panelWidth - 10),
          y: Math.min(Math.max(10, parsed.y), window.innerHeight - panelHeight - 10),
        };
      }
    } catch {
      // Fallback
    }

    return { x: defaultX, y: defaultY };
  });

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from left mouse button and not from interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }

    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const newX = Math.min(
        Math.max(10, e.clientX - dragOffsetRef.current.x),
        window.innerWidth - panelWidth - 10
      );
      const newY = Math.min(
        Math.max(10, e.clientY - dragOffsetRef.current.y),
        window.innerHeight - 80
      );

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position, panelWidth]);

  return {
    position,
    setPosition,
    handleMouseDown,
  };
}
