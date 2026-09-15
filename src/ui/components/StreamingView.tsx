import React, { useEffect, useRef } from 'react';
import { Square, FileText } from 'lucide-react';

interface StreamingViewProps {
  currentFileName: string;
  userPrompt: string;
  streamedText: string;
  onStop: () => void;
}

export const StreamingView: React.FC<StreamingViewProps> = ({
  currentFileName,
  userPrompt,
  streamedText,
  onStop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as tokens stream in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamedText]);

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Context info */}
      <div className="flex items-center justify-between text-xs bg-bg-secondary/70 border border-border-subtle px-3 py-1.5 rounded-lg">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-mono text-text-primary text-[11px] truncate">{currentFileName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
          <span className="text-[11px] text-text-secondary">Generating...</span>
        </div>
      </div>

      {/* User prompt preview */}
      <div className="px-3 py-2 bg-bg-secondary/50 border border-border-subtle rounded-lg text-xs text-text-secondary line-clamp-2">
        <span className="font-medium text-text-primary">Prompt: </span>
        {userPrompt}
      </div>

      {/* Streaming output container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[160px] max-h-[300px] overflow-y-auto p-3.5 bg-[#14141e] border border-border rounded-xl font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap select-text"
      >
        {streamedText}
        <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-accent animate-cursor"></span>
      </div>

      {/* Pulsing progress line */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-bg-tertiary">
        <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-accent to-purple-400 rounded-full animate-progress-pulse"></div>
      </div>

      {/* Stop generation button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 transition-colors shadow-sm active:scale-95"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
};
