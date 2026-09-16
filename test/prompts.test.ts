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

    const fullstack = ROLE_PRESETS.find((p) => p.id === 'role_fullstack');
    expect(fullstack).toBeDefined();
    expect(fullstack?.label).toBe('Full Stack Engineer');

    const aiml = ROLE_PRESETS.find((p) => p.id === 'role_aiml');
    expect(aiml).toBeDefined();
    expect(aiml?.label).toBe('AI / ML Engineer');

    const devops = ROLE_PRESETS.find((p) => p.id === 'role_devops');
    expect(devops).toBeDefined();
    expect(devops?.label).toBe('DevOps / Cloud');

    const verbs = ROLE_PRESETS.find((p) => p.id === 'action_verbs');
    expect(verbs).toBeDefined();
    expect(verbs?.category).toBe('action');

    const xyz = ROLE_PRESETS.find((p) => p.id === 'action_xyz');
    expect(xyz).toBeDefined();
    expect(xyz?.label).toBe('Google XYZ Formula');

    const ats = ROLE_PRESETS.find((p) => p.id === 'action_ats');
    expect(ats).toBeDefined();
    expect(ats?.label).toBe('ATS Keyword Optimizer');
  });

  it('builds resume prompt with target company and role context', () => {
    const built = buildPrompt(
      'Optimize for Google XYZ',
      {
        selectedText: '\\resumeItem{Led migration to Kubernetes}',
        currentFileName: 'resume.tex',
        docMode: 'resume',
        targetCompany: 'Stripe',
        targetRole: 'Staff Distributed Systems Engineer',
        jobDescription: 'Seeking expert in high-throughput payment rails and Kafka.',
      },
      'action_xyz'
    );

    expect(built.detectedDocMode).toBe('resume');
    expect(built.systemPrompt).toContain('WriteTex Resume Optimizer');
    expect(built.systemPrompt).toContain('Google\'s XYZ formula');
    expect(built.userPrompt).toContain('[TARGET POSITION]');
    expect(built.userPrompt).toContain('Company: Stripe');
    expect(built.userPrompt).toContain('Role: Staff Distributed Systems Engineer');
    expect(built.userPrompt).toContain('[JOB DESCRIPTION / KEY REQUIREMENTS]');
    expect(built.userPrompt).toContain('Seeking expert in high-throughput payment rails and Kafka.');
    expect(built.userPrompt).toContain('[SELECTED LATEX CODE]');
    expect(built.userPrompt).toContain('\\resumeItem{Led migration to Kubernetes}');
  });

  it('builds cover letter prompt from resume selection', () => {
    const built = buildPrompt(
      'Draft a high-impact cover letter',
      {
        selectedText: '\\resumeItem{Architected data pipeline processing 50TB daily with 99.99% uptime.}',
        currentFileName: 'cover_letter.tex',
        docMode: 'cover_letter',
        targetCompany: 'Datadog',
        targetRole: 'Principal SRE',
      },
      'cl_draft_full'
    );

    expect(built.detectedDocMode).toBe('cover_letter');
    expect(built.systemPrompt).toContain('WriteTex Cover Letter Architect');
    expect(built.systemPrompt).toContain('HOOK & THESIS');
    expect(built.userPrompt).toContain('[CANDIDATE RESUME EXPERIENCE / BACKGROUND]');
    expect(built.userPrompt).toContain('Architected data pipeline processing 50TB daily');
    expect(built.userPrompt).toContain('Company: Datadog');
    expect(built.userPrompt).toContain('Role: Principal SRE');
  });

  it('auto-detects cover letter mode from document class or content', () => {
    const letterDoc = buildPrompt(
      'Refine the opening',
      {
        currentFileContent: '\\documentclass{letter}\n\\opening{Dear Hiring Manager,}\nI am thrilled to apply...',
      }
    );
    expect(letterDoc.detectedDocMode).toBe('cover_letter');

    const queryDoc = buildPrompt(
      'Write a cover letter for this engineering position',
      {
        selectedText: '5 years of Python experience',
      }
    );
    expect(queryDoc.detectedDocMode).toBe('cover_letter');
  });

  it('injects analyzed GitHub projects into prompt context', () => {
    const built = buildPrompt(
      'Generate LaTeX project section',
      {
        currentFileName: 'resume.tex',
        targetRole: 'Senior AI Engineer',
        githubAnalysis: {
          username: 'alexdev',
          profileUrl: 'https://github.com/alexdev',
          publicReposCount: 24,
          topLanguages: [
            { language: 'Python', count: 12 },
            { language: 'C++', count: 4 },
          ],
          allTopics: ['deep-learning', 'cuda', 'llm'],
          allProjects: [],
          topProjects: [
            {
              name: 'flash-attention-opt',
              fullName: 'alexdev/flash-attention-opt',
              description: 'Custom CUDA kernels for FlashAttention-2 with 2.4x speedup',
              url: 'https://github.com/alexdev/flash-attention-opt',
              htmlUrl: 'https://github.com/alexdev/flash-attention-opt',
              language: 'CUDA',
              stars: 320,
              forks: 25,
              updatedAt: new Date().toISOString(),
              topics: ['cuda', 'flash-attention', 'llm'],
              isFork: false,
              roleMatchReason: 'Custom CUDA kernel engineering and LLM acceleration.',
              selected: true,
            },
          ],
          analyzedAt: Date.now(),
        },
      },
      'action_github_projects'
    );

    expect(built.userPrompt).toContain('[CANDIDATE TOP GITHUB PROJECTS & OPEN SOURCE WORK]');
    expect(built.userPrompt).toContain('https://github.com/alexdev');
    expect(built.userPrompt).toContain('@alexdev');
    expect(built.userPrompt).toContain('Top Languages: Python (12), C++ (4)');
    expect(built.userPrompt).toContain('flash-attention-opt');
    expect(built.userPrompt).toContain('Custom CUDA kernels for FlashAttention-2');
    expect(built.userPrompt).toContain('Custom CUDA kernel engineering and LLM acceleration.');
    expect(built.userPrompt).toContain('Role Relevance:');
  });

  it('provides GitHub-specific presets for resume and cover letter', () => {
    const githubProjectsPreset = ROLE_PRESETS.find((p) => p.id === 'action_github_projects');
    expect(githubProjectsPreset).toBeDefined();
    expect(githubProjectsPreset?.label).toBe('Auto-Add GitHub Projects');
    expect(githubProjectsPreset?.userPrompt).toContain('\\resumeProjectHeading');

    const githubSkillsPreset = ROLE_PRESETS.find((p) => p.id === 'action_github_skills');
    expect(githubSkillsPreset).toBeDefined();
    expect(githubSkillsPreset?.label).toBe('Sync GitHub Skills');
  });

  it('activates ERROR_FIXING_SYSTEM_PROMPT and injects compiler logs when hasNoPdf or errors are present', () => {
    const built = buildPrompt(
      'fix the errors',
      {
        currentFileName: 'main.tex',
        hasNoPdf: true,
        overleafErrors: [
          {
            type: 'error',
            title: 'Emergency stop. ./main.tex',
            message: 'Emergency stop. ./main.tex, line 3',
            line: 3,
          },
          {
            type: 'error',
            title: '*** (job aborted, no legal \\end found)',
            message: '*** (job aborted, no legal \\end found)',
          },
        ],
        currentFileContent: '\\documentclass[letterpaper,11pt]{article}\ne{latexsym}\n\\begin{document}\n\\end{document}',
      },
      'fix_errors'
    );

    // Enforces error fixing system prompt with zero-hallucination policy
    expect(built.systemPrompt).toContain('WriteTex LaTeX Debugger & Compiler Diagnostics Specialist');
    expect(built.systemPrompt).toContain('STRICT ZERO-HALLUCINATION POLICY');
    expect(built.systemPrompt).toContain('NEVER invent fictional companies');
    expect(built.systemPrompt).toContain('PREAMBLE & TRUNCATED MACRO REPAIR');
    expect(built.systemPrompt).toContain('e{latexsym}');

    // Injects compiler errors & No PDF status into the user prompt
    expect(built.userPrompt).toContain('[OVERLEAF COMPILER ERRORS & BUILD LOG]');
    expect(built.userPrompt).toContain('Status: "No PDF" produced by LaTeX compiler');
    expect(built.userPrompt).toContain('Emergency stop. ./main.tex');
    expect(built.userPrompt).toContain('Line: 3');
    expect(built.userPrompt).toContain('job aborted, no legal \\end found');
  });
});

