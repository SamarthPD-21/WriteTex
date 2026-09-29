import { useEffect, useState, useCallback } from 'react';
import { overleafAdapter } from '../../adapters/overleaf';
import { SelectionRange, CurrentLineInfo, EditOutcome } from '../../messaging/types';

export function useEditor() {
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [currentLine, setCurrentLine] = useState<CurrentLineInfo | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('main.tex');
  const [docLength, setDocLength] = useState<number>(0);
  const [isEditorReady, setIsEditorReady] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const refreshName = () => {
      const name = overleafAdapter.getCurrentFileName();
      if (name) setCurrentFileName(name);
    };

    overleafAdapter.waitForEditor(10000).then((ready) => {
      if (!mounted) return;
      setIsEditorReady(ready);
      refreshName();
    });

    const cleanup = overleafAdapter.onSnapshotChange((snapshot) => {
      if (!mounted) return;
      refreshName();
      if (!snapshot) return;
      setIsEditorReady(true);
      // Keep object identity when nothing changed so dependents don't re-render
      setSelectionRange((prev) =>
        prev &&
        prev.from === snapshot.selection.from &&
        prev.to === snapshot.selection.to &&
        prev.text === snapshot.selection.text
          ? prev
          : snapshot.selection
      );
      setCurrentLine((prev) =>
        prev && prev.from === snapshot.line.from && prev.text === snapshot.line.text ? prev : snapshot.line
      );
      setDocLength(snapshot.docLength);
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const getFullContent = useCallback(async (): Promise<string | null> => {
    return overleafAdapter.getCurrentFileContent();
  }, []);

  /** Guarded write: only replaces [from, to) if it still holds `expected`. */
  const applyEdit = useCallback(
    (from: number, to: number, replacement: string, expected: string): Promise<EditOutcome> =>
      overleafAdapter.applyEdit(from, to, replacement, expected),
    []
  );

  const selectedText = selectionRange && !selectionRange.empty ? selectionRange.text : '';

  return {
    isEditorReady,
    selectedText,
    currentFileName,
    selectionRange,
    currentLine,
    docLength,
    projectId: overleafAdapter.getProjectId(),
    getFullContent,
    applyEdit,
  };
}
