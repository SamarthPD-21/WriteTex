import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
  hasSelection: boolean;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  isOpen,
  hasSelection,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[2147483646] select-none">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-full font-medium text-xs text-white shadow-fab transition-all duration-300 ease-out active:scale-95 ${
          hasSelection
            ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-500 shadow-fabHover scale-105'
            : 'bg-gradient-to-r from-[#7c5cfc] to-[#9b82fd] hover:shadow-fabHover hover:scale-105'
        }`}
        title="Open WriteTex AI Copilot (Ctrl+Shift+W)"
      >
        <Sparkles className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`} />
        <span className="font-semibold tracking-wide">WriteTex</span>

        {hasSelection && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        )}
      </button>
    </div>
  );
};
