import * as Diff from 'diff';
import { DiffHunk, DiffLine, DiffResult, DiffWordPart } from './types';

/**
 * Computes structured line-by-line and word-level diffs between original and replacement text.
 */
export function computeDiff(original: string, replacement: string, fileName = 'selection.tex'): DiffResult {
  if (original === replacement) {
    return {
      original,
      replacement,
      hasChanges: false,
      additions: 0,
      deletions: 0,
      hunks: [],
      unifiedText: '',
    };
  }

  const lineChanges = Diff.diffLines(original, replacement);
  const patchText = Diff.createPatch(fileName, original, replacement, 'Original', 'WriteTex AI');

  let oldLineCounter = 1;
  let newLineCounter = 1;
  let additions = 0;
  let deletions = 0;

  const lines: DiffLine[] = [];

  for (const part of lineChanges) {
    // Split lines preserving empty lines correctly
    const partLines = part.value.replace(/\r\n/g, '\n').split('\n');
    // If the last element is empty string due to trailing newline, drop it
    if (partLines.length > 0 && partLines[partLines.length - 1] === '') {
      partLines.pop();
    }

    if (part.added) {
      for (const line of partLines) {
        additions++;
        lines.push({
          type: 'add',
          newLineNumber: newLineCounter++,
          content: line,
        });
      }
    } else if (part.removed) {
      for (const line of partLines) {
        deletions++;
        lines.push({
          type: 'delete',
          oldLineNumber: oldLineCounter++,
          content: line,
        });
      }
    } else {
      for (const line of partLines) {
        lines.push({
          type: 'unchanged',
          oldLineNumber: oldLineCounter++,
          newLineNumber: newLineCounter++,
          content: line,
        });
      }
    }
  }

  // Enhance adjacent delete + add pairs with word-level diffs
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].type === 'delete' && lines[i + 1].type === 'add') {
      const delLine = lines[i];
      const addLine = lines[i + 1];

      const wordDiffs = Diff.diffWordsWithSpace(delLine.content, addLine.content);
      const delWords: DiffWordPart[] = [];
      const addWords: DiffWordPart[] = [];

      for (const w of wordDiffs) {
        if (w.added) {
          addWords.push({ type: 'add', value: w.value });
        } else if (w.removed) {
          delWords.push({ type: 'delete', value: w.value });
        } else {
          delWords.push({ type: 'unchanged', value: w.value });
          addWords.push({ type: 'unchanged', value: w.value });
        }
      }

      delLine.wordParts = delWords;
      addLine.wordParts = addWords;
    }
  }

  // Create single or multi-hunk view
  const hunks: DiffHunk[] = [
    {
      oldStart: 1,
      oldLines: oldLineCounter - 1,
      newStart: 1,
      newLines: newLineCounter - 1,
      lines,
    },
  ];

  return {
    original,
    replacement,
    hasChanges: additions > 0 || deletions > 0,
    additions,
    deletions,
    hunks,
    unifiedText: patchText,
  };
}
