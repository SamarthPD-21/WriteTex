import { describe, expect, it } from 'vitest';
import { buildPrompt, cleanModelOutput } from '../src/prompts/builder';

describe('Prompt Builder', () => {
  it('builds prompt with selection and enriched context', () => {
    const built = buildPrompt(
      'Make this academic and concise',
      {
        selectedText: 'We found that accuracy goes up by 5 percent.',
        currentFileContent: '\\documentclass{article}\n\\section{Results}\nWe found that accuracy goes up by 5 percent.',
        currentFileName: 'results.tex',
      },
      'academic'
    );

    expect(built.systemPrompt).toBeDefined();
    expect(built.userPrompt).toContain('[SELECTED LATEX CODE]');
    expect(built.userPrompt).toContain('We found that accuracy goes up by 5 percent.');
    expect(built.userPrompt).toContain('Current file: results.tex');
    expect(built.userPrompt).toContain('Enclosing section: section: Results');
    expect(built.isExplanationOnly).toBe(false);
  });

  it('detects explanation mode for explain queries', () => {
    const built = buildPrompt(
      'Explain what this matrix equation does',
      {
        selectedText: 'A = U \\Sigma V^T',
      },
      'explain'
    );

    expect(built.isExplanationOnly).toBe(true);
  });

  it('cleans markdown code fences from LLM output', () => {
    const fenced = '```latex\n\\begin{equation}\n  E = mc^2\n\\end{equation}\n```';
    const cleaned = cleanModelOutput(fenced);
    expect(cleaned).toBe('\\begin{equation}\n  E = mc^2\n\\end{equation}');

    const untaggedFence = '```\n\\textbf{Bold text}\n```';
    expect(cleanModelOutput(untaggedFence)).toBe('\\textbf{Bold text}');

    const plain = '\\textbf{Already clean}';
    expect(cleanModelOutput(plain)).toBe('\\textbf{Already clean}');
  });
});
