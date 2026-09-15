import { useState, useRef, useCallback } from 'react';
import { GenerateRequest, Settings } from '../../messaging/types';
import { streamGenerationFromBackground } from '../../messaging/runtime';
import { computeDiff } from '../../diff/compute';
import { DiffResult } from '../../diff/types';

export type AIStatus = 'idle' | 'streaming' | 'done' | 'error';

export function useAI(settings: Settings) {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [streamedText, setStreamedText] = useState<string>('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelFnRef = useRef<(() => void) | null>(null);

  const generate = useCallback(
    async (
      userPrompt: string,
      context: {
        selectedText?: string;
        currentFileContent?: string;
        currentFileName?: string;
        currentLineNumber?: number;
        currentLineText?: string;
      },
      presetKey?: string
    ) => {
      // Abort any existing generation
      if (cancelFnRef.current) {
        cancelFnRef.current();
        cancelFnRef.current = null;
      }

      setError(null);
      setStreamedText('');
      setDiffResult(null);
      setStatus('streaming');

      const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const request: GenerateRequest = {
        requestId,
        userPrompt,
        presetKey,
        context,
        model: settings.model,
        provider: settings.provider,
        temperature: settings.temperature,
      };

      let accumulated = '';

      const cancel = streamGenerationFromBackground(
        request,
        (chunk) => {
          accumulated += chunk;
          setStreamedText(accumulated);
        },
        (finalOutput) => {
          setStatus('done');
          setStreamedText(finalOutput);

          // If there was a selection, compute diff between original and replacement
          const original = context.selectedText || context.currentLineText || '';
          if (original.trim().length > 0 && finalOutput.trim().length > 0) {
            const diff = computeDiff(original, finalOutput, context.currentFileName || 'paper.tex');
            setDiffResult(diff);
          }
        },
        (err) => {
          setStatus('error');
          setError(err);
        }
      );

      cancelFnRef.current = cancel;
    },
    [settings]
  );

  const stop = useCallback(() => {
    if (cancelFnRef.current) {
      cancelFnRef.current();
      cancelFnRef.current = null;
    }
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    if (cancelFnRef.current) {
      cancelFnRef.current();
      cancelFnRef.current = null;
    }
    setStatus('idle');
    setStreamedText('');
    setDiffResult(null);
    setError(null);
  }, []);

  return {
    status,
    streamedText,
    diffResult,
    setDiffResult,
    error,
    generate,
    stop,
    reset,
  };
}
