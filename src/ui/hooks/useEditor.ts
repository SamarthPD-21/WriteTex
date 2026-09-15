import { useEffect, useState, useCallback } from 'react';
import { overleafAdapter } from '../../adapters/overleaf';
import { SelectionRange, CurrentLineInfo } from '../../messaging/types';

export function useEditor() {
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('main.tex');
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [currentLine, setCurrentLine] = useState<CurrentLineInfo | null>(null);
  const [isEditorReady, setIsEditorReady] = useState<boolean>(false);

  // Initialize and check editor ready
  useEffect(() => {
    let mounted = true;

    overleafAdapter.waitForEditor(10000).then((ready) => {
      if (mounted) {
        setIsEditorReady(ready);
        const name = overleafAdapter.getCurrentFileName();
        if (name) setCurrentFileName(name);
      }
    });

    // Listen to selection changes in Overleaf
    const cleanup = overleafAdapter.onSelectionChange((text) => {
      if (mounted) {
        setSelectedText(text);
        const name = overleafAdapter.getCurrentFileName();
        if (name) setCurrentFileName(name);

        overleafAdapter.getSelectionRange().then((range) => {
          if (mounted) setSelectionRange(range);
        });
        overleafAdapter.getCurrentLine().then((line) => {
          if (mounted) setCurrentLine(line);
        });
      }
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const refreshContext = useCallback(async () => {
    const text = await overleafAdapter.getSelectedText();
    setSelectedText(text || '');
    const name = overleafAdapter.getCurrentFileName();
    if (name) setCurrentFileName(name);
    const range = await overleafAdapter.getSelectionRange();
    setSelectionRange(range);
    const line = await overleafAdapter.getCurrentLine();
    setCurrentLine(line);
    return { text, name, range, line };
  }, []);

  const getFullContent = useCallback(async (): Promise<string | null> => {
    return overleafAdapter.getCurrentFileContent();
  }, []);

  const replaceSelection = useCallback(async (replacement: string): Promise<boolean> => {
    return overleafAdapter.replaceSelection(replacement);
  }, []);

  const replaceRange = useCallback(
    async (from: number, to: number, replacement: string): Promise<boolean> => {
      return overleafAdapter.replaceRange(from, to, replacement);
    },
    []
  );

  return {
    isEditorReady,
    selectedText,
    currentFileName,
    selectionRange,
    currentLine,
    refreshContext,
    getFullContent,
    replaceSelection,
    replaceRange,
  };
}
