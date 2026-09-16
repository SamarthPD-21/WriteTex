import { describe, expect, it } from 'vitest';
import { computeDiff } from '../src/diff/compute';
import { applyFuzzyPatch } from '../src/diff/apply';

describe('Diff Engine', () => {
  it('detects no changes when strings are identical', () => {
    const text = '\\section{Introduction}\nThis is a paper.';
    const result = computeDiff(text, text);
    expect(result.hasChanges).toBe(false);
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(0);
  });

  it('computes accurate additions and deletions', () => {
    const original = 'We use a model to classify text.\nSecond line.';
    const replacement = 'We employ the proposed model for classification.\nSecond line.';
    const result = computeDiff(original, replacement);

    expect(result.hasChanges).toBe(true);
    expect(result.deletions).toBe(1);
    expect(result.additions).toBe(1);
    expect(result.hunks.length).toBeGreaterThan(0);

    const firstHunk = result.hunks[0];
    const delLine = firstHunk.lines.find((l) => l.type === 'delete');
    const addLine = firstHunk.lines.find((l) => l.type === 'add');

    expect(delLine?.content).toBe('We use a model to classify text.');
    expect(addLine?.content).toBe('We employ the proposed model for classification.');

    // Check word-level breakdown
    expect(delLine?.wordParts).toBeDefined();
    expect(addLine?.wordParts).toBeDefined();
  });

  it('applies exact replacement when snippet is uniquely found', () => {
    const fullDoc = '\\documentclass{article}\n\\begin{document}\nOld sentence.\n\\end{document}';
    const original = 'Old sentence.';
    const replacement = 'New sentence with \\cite{smith2024}.';

    const res = applyFuzzyPatch(fullDoc, original, replacement);
    expect(res.success).toBe(true);
    expect(res.patchedText).toContain('New sentence with \\cite{smith2024}.');
    expect(res.patchedText).not.toContain('Old sentence.');
  });

  it('applies fuzzy patch when document has slight surrounding edits', () => {
    const originalSnippet = 'We observed an increase in accuracy from 82% to 94%.';
    const replacementSnippet = 'Our experiments demonstrated a marked accuracy improvement from 82% to 94.6%.';

    // Surrounding text modified slightly
    const modifiedDoc =
      '\\section{Results}\n' +
      'Here are our findings: We observed an increase in accuracy from 82% to 94%. Furthermore, latency was stable.';

    const res = applyFuzzyPatch(modifiedDoc, originalSnippet, replacementSnippet);
    expect(res.success).toBe(true);
    expect(res.patchedText).toContain('Our experiments demonstrated a marked accuracy improvement from 82% to 94.6%.');
  });

  it('safely rejects patch if snippet cannot be located and does not corrupt document', () => {
    const fullDoc = '\\documentclass{article}\n\\begin{document}\n\\section{Experience}\n\\resumeItem{Real experience}\n\\end{document}';
    const nonExistentSnippet = '\\resumeItem{Fictional non-existent job}';
    const replacement = '\\resumeItem{Something else}';

    const res = applyFuzzyPatch(fullDoc, nonExistentSnippet, replacement);
    expect(res.success).toBe(false);
    expect(res.patchedText).toBe(fullDoc); // Entire document left 100% untouched!
    expect(res.patchedText).toContain('\\documentclass{article}');
    expect(res.patchedText).toContain('\\resumeItem{Real experience}');
  });

  it('correctly picks closest occurrence when snippet appears multiple times', () => {
    const fullDoc =
      '\\resumeItemListStart\n' +
      '  \\resumeItem{First achievement}\n' +
      '\\resumeItemListEnd\n' +
      '\n' +
      '\\resumeItemListStart\n' +
      '  \\resumeItem{Second achievement}\n' +
      '\\resumeItemListEnd';

    const snippet = '\\resumeItemListStart';
    const replacement = '\\resumeItemListStart % Modified';

    // Target the second occurrence (around index 70)
    const res = applyFuzzyPatch(fullDoc, snippet, replacement, 75);
    expect(res.success).toBe(true);

    // The first occurrence must be untouched
    expect(res.patchedText.startsWith('\\resumeItemListStart\n')).toBe(true);
    // The second occurrence must be replaced
    expect(res.patchedText).toContain('\\resumeItemListStart % Modified\n  \\resumeItem{Second achievement}');
  });
});
