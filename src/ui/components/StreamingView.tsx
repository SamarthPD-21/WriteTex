import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Square } from 'lucide-react';
import { Button } from './ui';

interface StreamingViewProps {
  currentFileName: string;
  userPrompt: string;
  streamedText: string;
  onStop: () => void;
}

export const StreamingView: React.FC<StreamingViewProps> = ({ currentFileName, userPrompt, streamedText, onStop }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Follow the output unless the user scrolled up to read
  useEffect(() => {
    const el = containerRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [streamedText]);

  const words = streamedText.trim() ? streamedText.trim().split(/\s+/).length : 0;
  const waiting = streamedText.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5 p-3">
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-surface-2 border border-line">
        <Loader2 className="w-3.5 h-3.5 mt-0.5 text-indigo-300 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] text-zinc-200 line-clamp-2">{userPrompt}</div>
          <div className="text-[10.5px] text-zinc-500 font-mono truncate">
            {currentFileName} · {waiting ? 'waiting for the model' : `${words} words`} · {elapsed}s
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="flex-1 min-h-[180px] overflow-y-auto p-3 bg-surface-0 border border-line rounded-xl font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap select-text no-scrollbar"
      >
        {waiting ? (
          <div className="flex flex-col gap-2" aria-label="Waiting for response">
            {[92, 78, 85, 60].map((w, i) => (
              <div key={i} className="h-2.5 rounded bg-white/[0.05] animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <>
            {streamedText}
            <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-indigo-400 animate-cursor" />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-line">
        <span className="text-[10.5px] text-zinc-500">You’ll review every change before it’s applied.</span>
        <Button variant="danger" size="md" className="ml-auto" onClick={onStop} icon={<Square className="w-3 h-3 fill-current" />}>
          Stop
        </Button>
      </div>
    </div>
  );
};
