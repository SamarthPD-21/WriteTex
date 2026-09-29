import { useState, useRef, useCallback, useEffect } from 'react';
import { GenerateRequest, Settings, EditorContext } from '../../messaging/types';
import { streamGenerationFromBackground } from '../../messaging/runtime';
import { isExplanationQuery } from '../../prompts/intent';
import { EditPlan, planEdit, PlanOptions } from '../../diff/edit-plan';

export type AIStatus = 'idle' | 'streaming' | 'done' | 'error';
export type FinishReason = 'complete' | 'truncated' | 'refused' | 'unknown';

export interface GenerationResult {
  /** Stable across plan updates (edit, relocate), so each generation is recorded once. */
  id: string;
  prompt: string;
  output: string;
  finishReason: FinishReason;
  /** 'answer' results are prose for the user; 'edit' results target the document. */
  kind: 'edit' | 'answer';
  /** Where the edit lands; null when no safe target was found. */
  plan: EditPlan | null;
  /** 'preview' results come from history, templates, or formatters rather than a model call. */
  source: 'model' | 'preview';
}

export function useAI(settings: Settings) {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [streamedText, setStreamedText] = useState<string>('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');

  const cancelFnRef = useRef<(() => void) | null>(null);
  const frameRef = useRef<number | null>(null);
  const bufferRef = useRef('');

  // Tokens arrive far faster than the screen refreshes; render at most once per frame
  const scheduleFlush = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setStreamedText(bufferRef.current);
    });
  }, []);

  const cancelActive = useCallback(() => {
    cancelFnRef.current?.();
    cancelFnRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(() => cancelActive, [cancelActive]);

  const generate = useCallback(
    (userPrompt: string, context: EditorContext, presetKey: string | undefined, target: PlanOptions) => {
      cancelActive();
      setError(null);
      setStreamedText('');
      setResult(null);
      setLastPrompt(userPrompt);
      setStatus('streaming');
      bufferRef.current = '';

      const request: GenerateRequest = {
        requestId: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userPrompt,
        presetKey,
        context,
        model: settings.model,
        provider: settings.provider,
        temperature: settings.temperature,
      };

      cancelFnRef.current = streamGenerationFromBackground(
        request,
        (chunk) => {
          bufferRef.current += chunk;
          scheduleFlush();
        },
        (finalOutput, finishReason = 'unknown') => {
          cancelFnRef.current = null;
          setStreamedText(finalOutput);

          if (finishReason === 'refused') {
            setStatus('error');
            setError('The model declined this request. Try rephrasing it or switching models.');
            return;
          }

          const kind = isExplanationQuery(userPrompt, presetKey) ? 'answer' : 'edit';
          const plan = kind === 'edit' ? planEdit(context.currentFileContent || '', finalOutput, target) : null;
          setResult({ id: request.requestId, prompt: userPrompt, output: finalOutput, finishReason, kind, plan, source: 'model' });
          setStatus('done');
        },
        (err) => {
          cancelFnRef.current = null;
          setStatus('error');
          setError(err);
        }
      );
    },
    [settings, cancelActive, scheduleFlush]
  );

  /** Shows existing LaTeX (history, GitHub formatter, templates) for review without calling a model. */
  const preview = useCallback((prompt: string, output: string, plan: EditPlan | null) => {
    cancelActive();
    setError(null);
    setStreamedText(output);
    setResult({ id: `preview_${Date.now()}`, prompt, output, finishReason: 'complete', kind: 'edit', plan, source: 'preview' });
    setStatus('done');
  }, [cancelActive]);

  const updatePlan = useCallback((plan: EditPlan | null) => {
    setResult((prev) => (prev ? { ...prev, plan } : prev));
  }, []);

  const stop = useCallback(() => {
    cancelActive();
    setStatus('idle');
  }, [cancelActive]);

  const reset = useCallback(() => {
    cancelActive();
    setStatus('idle');
    setStreamedText('');
    setResult(null);
    setError(null);
  }, [cancelActive]);

  return { status, streamedText, result, error, lastPrompt, generate, preview, updatePlan, stop, reset };
}
