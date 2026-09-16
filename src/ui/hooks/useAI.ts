import { useState, useRef, useCallback } from 'react';
import { GenerateRequest, Settings, EditorContext } from '../../messaging/types';
import { streamGenerationFromBackground } from '../../messaging/runtime';
import { computeDiff } from '../../diff/compute';
import { DiffResult } from '../../diff/types';

import { locateWrongSnippetInDoc } from '../../diff/smart-replace';

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
      context: EditorContext,
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

          // If there was a selection, compute diff between original and replacement.
          // Fall back to intelligent snippet location in document content.
          let original = context.selectedText || '';
          if (!original.trim()) {
            if (
              context.hasNoPdf ||
              (context.overleafErrors && context.overleafErrors.length > 0) ||
              finalOutput.includes('\\documentclass') ||
              finalOutput.includes('\\begin{document}')
            ) {
              original = context.currentFileContent || context.currentLineText || '';
            } else {
              // Intelligently identify the exact target section or block in current document
              const doc = context.currentFileContent || '';
              const loc = locateWrongSnippetInDoc(doc, finalOutput, {
                originalDocSnapshot: doc,
                originalSnippet: context.selectedText,
                approximateIndex: context.currentLineNumber !== undefined ? undefined : 0,
              });
              if (loc && loc.matchedText && loc.matchedText.trim().length > 0) {
                original = loc.matchedText;
              } else {
                original = context.currentLineText || context.currentFileContent || '';
              }
            }
          }

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
