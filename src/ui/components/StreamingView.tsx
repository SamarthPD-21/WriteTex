import React, { useEffect, useRef } from 'react';
import { Square, FileText, Activity } from 'lucide-react';

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

  const wordCount = streamedText.trim() ? streamedText.trim().split(/\s+/).filter(Boolean).length : 0;
  const tokenEstimate = Math.round(streamedText.length / 4);

  return (
    <div className="flex flex-col h-full gap-3 p-4 select-none">
      {/* Context info */}
      <div className="flex items-center justify-between text-xs bg-[#13131e] border border-border/80 px-3 py-1.5 rounded-xl">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-mono text-text-primary text-[11px] truncate font-medium">{currentFileName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
          <span className="text-[11px] text-accent font-semibold">Streaming LaTeX...</span>
        </div>
      </div>

      {/* User prompt preview */}
      <div className="px-3 py-2 bg-[#12121c] border border-border/60 rounded-xl text-xs text-text-secondary line-clamp-2">
        <span className="font-semibold text-text-primary">Prompt: </span>
        {userPrompt}
      </div>

      {/* Streaming output container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[170px] max-h-[320px] overflow-y-auto p-3.5 bg-[#0f0f18] border border-border/90 rounded-xl font-mono text-[11.5px] text-text-primary leading-relaxed whitespace-pre-wrap select-text"
      >
        {streamedText}
        <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-accent animate-cursor"></span>
      </div>

      {/* Pulsing progress line */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-[#1b1b2a]">
        <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-accent to-[#a78bfa] rounded-full animate-progress-pulse"></div>
      </div>

      {/* Live throughput stats & Stop generation button */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2 text-[10.5px] font-mono text-text-muted">
          <Activity className="w-3 h-3 text-accent" />
          <span>{wordCount} words</span>
          <span>·</span>
          <span>~{tokenEstimate} tokens</span>
        </div>

        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-200 bg-red-950/60 hover:bg-red-900 border border-red-800/60 transition-all shadow-sm active:scale-95 animate-pulse"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
};
