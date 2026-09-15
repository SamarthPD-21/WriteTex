import { describe, expect, it } from 'vitest';
import { buildPrompt, cleanModelOutput } from '../src/prompts/builder';
import { ROLE_PRESETS } from '../src/prompts/presets';

describe('Prompt Builder', () => {
  it('builds prompt with selection and enriched context', () => {
    const built = buildPrompt(
      'Tailor for Senior Software Engineer',
      {
        selectedText: 'Built the microservices backend and reduced latency by 30%.',
        currentFileContent: '\\documentclass{article}\n\\section{Experience}\nBuilt the microservices backend and reduced latency by 30%.',
        currentFileName: 'resume.tex',
      },
      'role_swe'
    );

    expect(built.systemPrompt).toBeDefined();
    expect(built.userPrompt).toContain('[SELECTED LATEX CODE]');
    expect(built.userPrompt).toContain('Built the microservices backend and reduced latency by 30%.');
    expect(built.userPrompt).toContain('Current file: resume.tex');
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
    const fenced = '```latex\n\\resumeItem{Engineered distributed key-value store}\n```';
    const cleaned = cleanModelOutput(fenced);
    expect(cleaned).toBe('\\resumeItem{Engineered distributed key-value store}');

    const untaggedFence = '```\n\\textbf{Bold text}\n```';
    expect(cleanModelOutput(untaggedFence)).toBe('\\textbf{Bold text}');

    const plain = '\\textbf{Already clean}';
    expect(cleanModelOutput(plain)).toBe('\\textbf{Already clean}');
  });

  it('provides role presets for career and resume building', () => {
    const swe = ROLE_PRESETS.find((p) => p.id === 'role_swe');
    expect(swe).toBeDefined();
    expect(swe?.label).toBe('Software Engineer');

    const aiml = ROLE_PRESETS.find((p) => p.id === 'role_aiml');
    expect(aiml).toBeDefined();
    expect(aiml?.label).toBe('AI / ML Engineer');

    const pm = ROLE_PRESETS.find((p) => p.id === 'role_pm');
    expect(pm).toBeDefined();
    expect(pm?.label).toBe('Product Manager');

    const verbs = ROLE_PRESETS.find((p) => p.id === 'action_verbs');
    expect(verbs).toBeDefined();
    expect(verbs?.category).toBe('action');
  });
});
