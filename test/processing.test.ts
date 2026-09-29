import { describe, expect, it } from 'vitest';
import { findSnippetLocation } from '../src/diff/apply';
import { locateWrongSnippetInDoc, SnippetReplacementLocation } from '../src/diff/smart-replace';
import { validateLatex } from '../src/latex/validator';
import { autoRepairLatexDocument } from '../src/latex/auto-repair';
import { analyzeKeywordGap, extractKeywordsFromJD } from '../src/analysis/keyword-gap';
import { buildPrompt, cleanModelOutput, selectDocumentExcerpt } from '../src/prompts/builder';
import { EditorContext } from '../src/messaging/types';

const resume = `\\documentclass{article}
\\usepackage{enumitem}
\\begin{document}
\\section{Experience}
\\resumeSubHeadingListStart
  \\resumeSubheading
    {Acme Robotics}{June 2022 -- Present}
    {Software Engineer}{San Francisco, CA}
    \\resumeItemListStart
      \\resumeItem{Built a telemetry pipeline processing 2M events per day using Kafka}
      \\resumeItem{Reduced deploy time by 40\\% by migrating CI to GitHub Actions}
      \\resumeItem{Mentored three interns on code review and testing practices}
    \\resumeItemListEnd
  \\resumeSubheading
    {Globex Corp}{May 2020 -- May 2022}
    {Backend Intern}{San Francisco, CA}
    \\resumeItemListStart
      \\resumeItem{Wrote REST endpoints for the billing service in Go}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd

\\section{Technical Skills}
Languages: Go, Python

\\end{document}
`;

function apply(doc: string, loc: SnippetReplacementLocation | null, rep: string): string {
  expect(loc).not.toBeNull();
  return doc.slice(0, loc!.from) + (loc!.replacementText ?? rep) + doc.slice(loc!.to);
}

describe('Snippet locator', () => {
  it('fuzzy-matches long snippets instead of throwing', () => {
    const drifted = '\\resumeItem{Built a telemetry pipline processing 2M events per day using Kafka}';
    const loc = findSnippetLocation(resume, drifted, 200);
    expect(loc?.matchedText).toBe('\\resumeItem{Built a telemetry pipeline processing 2M events per day using Kafka}');
  });

  it('matches snippets that were re-indented', () => {
    const loc = findSnippetLocation(resume, '\\resumeSubheading {Globex Corp}{May 2020 -- May 2022}');
    expect(loc?.matchedText).toContain('Globex Corp');
    expect(loc?.matchedText.startsWith('\\resumeSubheading')).toBe(true);
  });

  it('refuses to guess between identical occurrences', () => {
    expect(findSnippetLocation(resume, '{San Francisco, CA}')).toBeNull();
  });
});

describe('Smart replacement', () => {
  it('replaces a single entry without touching the preamble or other entries', () => {
    const rep = `\\resumeSubheading
    {Globex Corp}{May 2020 -- May 2022}
    {Backend Intern}{San Francisco, CA}
    \\resumeItemListStart
      \\resumeItem{Engineered REST endpoints for the billing service in Go}
    \\resumeItemListEnd`;
    const loc = locateWrongSnippetInDoc(resume, rep);
    expect(loc?.reason).toBe('content_anchor');
    const out = apply(resume, loc, rep);
    expect(out).toContain('\\documentclass{article}');
    expect(out).toContain('Built a telemetry pipeline');
    expect(out).toContain('Engineered REST endpoints');
    expect(out).not.toContain('Wrote REST endpoints');
    expect(out).toContain('\\resumeItemListEnd\n\\resumeSubHeadingListEnd');
  });

  it('rewrites only the returned bullets and keeps the ones in between', () => {
    const rep = `\\resumeItem{Architected a Kafka telemetry pipeline processing 2M events per day}
\\resumeItem{Mentored three interns on code review, testing and design practices}`;
    const loc = locateWrongSnippetInDoc(resume, rep);
    expect(loc?.reason).toBe('bullet_match');
    const out = apply(resume, loc, rep);
    expect(out).toContain('Architected a Kafka telemetry pipeline');
    expect(out).toContain('Reduced deploy time by 40\\%');
    expect(out).toContain('testing and design practices');
    expect(out).not.toContain('Built a telemetry pipeline');
    expect(out.match(/\\resumeItem\{/g)?.length).toBe(4);
  });

  it('spans every section a multi-section replacement covers', () => {
    const rep = `\\section{Experience}\nNew experience\n\\section{Technical Skills}\nLanguages: Go, Rust`;
    const out = apply(resume, locateWrongSnippetInDoc(resume, rep), rep);
    expect(out.match(/\\section\{/g)?.length).toBe(2);
    expect(out).toContain('Languages: Go, Rust');
    expect(out).not.toContain('Acme Robotics');
    expect(out).toContain('\\end{document}');
  });

  it('inserts a missing section in conventional order', () => {
    const rep = '\\section{Summary}\nBackend engineer focused on data infrastructure.';
    const loc = locateWrongSnippetInDoc(resume, rep);
    expect(loc?.reason).toBe('section_insert_slot');
    const out = apply(resume, loc, rep);
    expect(out.indexOf('\\section{Summary}')).toBeLessThan(out.indexOf('\\section{Experience}'));
  });

  it('adds a new job at the top of the experience list', () => {
    const rep = `\\resumeSubheading
    {Initech}{Jan 2024 -- Present}
    {Senior Engineer}{Austin, TX}`;
    const out = apply(resume, locateWrongSnippetInDoc(resume, rep), rep);
    expect(out.indexOf('Initech')).toBeLessThan(out.indexOf('Acme Robotics'));
    expect(out).toContain('Globex Corp');
  });

  it('matches rewritten cover letter paragraphs', () => {
    const letter = `\\documentclass{letter}
\\begin{document}
\\opening{Dear Hiring Team,}

I am writing to apply for the backend engineer position at Stripe because I love payments.

At Acme Robotics I built a telemetry pipeline that processes two million events every day.

\\closing{Sincerely,}
\\end{document}`;
    const rep = 'At Acme Robotics I designed and built a Kafka telemetry pipeline that processes two million events every day with sub-second latency.';
    const loc = locateWrongSnippetInDoc(letter, rep);
    expect(loc?.reason).toBe('paragraph_match');
    const out = apply(letter, loc, rep);
    expect(out).toContain('I am writing to apply');
    expect(out).toContain('sub-second latency');
    expect(out).not.toContain('I built a telemetry pipeline');
  });
});

describe('LaTeX validator', () => {
  it('ignores braces in comments and after \\\\ line breaks', () => {
    expect(validateLatex('text % a { comment\nmore').valid).toBe(true);
    expect(validateLatex('a \\\\{b} c').valid).toBe(true);
    expect(validateLatex('\\verb|{| and \\{ escaped').valid).toBe(true);
  });

  it('reports the line of an unmatched brace', () => {
    const res = validateLatex('ok\nfine}\n');
    expect(res.errors[0]).toContain('Line 2');
  });
});

describe('Auto-repair safety', () => {
  it('leaves a healthy cover letter preamble alone', () => {
    const letter = '\\documentclass{letter}\n\\begin{document}\nHi\n\\end{document}';
    expect(autoRepairLatexDocument(letter).wasRepaired).toBe(false);
  });

  it('does not prepend a preamble to a clean subfile', () => {
    expect(autoRepairLatexDocument('\\resumeItem{Shipped the thing}\n').wasRepaired).toBe(false);
  });

  it('keeps a preamble whose macros come from an included file', () => {
    const doc = '\\documentclass{article}\n\\input{macros}\n\\begin{document}\n\\resumeItem{x}\n\\end{document}';
    expect(autoRepairLatexDocument(doc).wasRepaired).toBe(false);
  });
});

describe('Keyword gap', () => {
  it('ignores boilerplate acronyms and ambiguous words', () => {
    const kws = extractKeywordsFromJD(
      'We are an EEO employer in the US. Join our go-to-market R&D team. Experience with React and k8s. PTO included.'
    );
    expect(kws).toEqual(['kubernetes', 'react']);
  });

  it('treats common spellings as the same skill', () => {
    const gap = analyzeKeywordGap('Experience with PostgreSQL, Kubernetes, Node.js', 'Used Postgres, K8s and NodeJS');
    expect(gap.missingKeywords).toEqual([]);
    expect(gap.matchPercentage).toBe(100);
  });

  it('orders missing keywords by prominence in the JD', () => {
    const jd = 'Required: strong Terraform and Terraform modules experience.\nNice to have: Redis.';
    expect(analyzeKeywordGap(jd, 'Python').missingKeywords).toEqual(['terraform', 'redis']);
  });
});

describe('Prompt building', () => {
  it('strips chatter around a fenced answer but keeps real explanations', () => {
    expect(cleanModelOutput('Here is the revised text:\n```latex\n\\resumeItem{x}\n```\nLet me know!')).toBe('\\resumeItem{x}');
    expect(cleanModelOutput('Sure! Here is the update:\n\\resumeItem{x}')).toBe('\\resumeItem{x}');
    const explanation = 'The \\resumeItem macro wraps an \\item.\n```latex\n\\resumeItem{x}\n```\nIt is defined in the preamble using \\newcommand, which takes one argument and adds small vertical spacing after the bullet so lists stay compact. You can change the spacing there.';
    expect(cleanModelOutput(explanation)).toContain('defined in the preamble');
  });

  it('does not switch to compiler-debug mode for resume content about errors', () => {
    const built = buildPrompt('Rewrite bullets to show I reduced error rates by 30%', { currentFileContent: resume } as EditorContext);
    expect(built.systemPrompt).toContain('WriteTex Resume Optimizer');
    const fix = buildPrompt('Please fix the compile errors', { currentFileContent: resume } as EditorContext);
    expect(fix.systemPrompt).toContain('LaTeX Debugger');
  });

  it('adds keyword gap analysis when a job description is present', () => {
    const built = buildPrompt('Tailor my resume', {
      currentFileContent: resume,
      jobDescription: 'Must have Kubernetes and Python. Terraform is a plus.',
    } as EditorContext);
    expect(built.userPrompt).toContain('[KEYWORD GAP ANALYSIS]');
    expect(built.userPrompt).toContain('Missing from resume (most important first): kubernetes, terraform');
  });

  it('summarizes a long preamble instead of truncating the body', () => {
    const preamble = '\\documentclass{article}\n' + '\\newcommand{\\resumeItem}[1]{#1}\n' + '% filler\n'.repeat(3000);
    const doc = preamble + '\\begin{document}\n\\section{Experience}\nLast line\n\\end{document}';
    const excerpt = selectDocumentExcerpt(doc, false);
    expect(excerpt).toContain('Custom macros it defines: \\resumeItem');
    expect(excerpt).toContain('Last line');
    expect(excerpt.length).toBeLessThan(doc.length);
  });
});

describe('Intent detection', () => {
  it('treats questions as answers and instructions as edits', async () => {
    const { isExplanationQuery } = await import('../src/prompts/intent');
    expect(isExplanationQuery('What does \\resumeSubheading take?')).toBe(true);
    expect(isExplanationQuery('[Target Role: SWE] why is my PDF blank')).toBe(true);
    expect(isExplanationQuery('Describe my Kafka project in two bullets')).toBe(false);
    expect(isExplanationQuery('Tighten these bullets')).toBe(false);
    expect(isExplanationQuery('anything', 'explain')).toBe(true);
  });
});

describe('Locator regressions', () => {
  const doc = `\\documentclass{article}
\\usepackage{enumitem}
\\begin{document}
\\section{Experience}
\\resumeItem{Built the internal CLI,
  improving developer experience by 30\\%}
\\resumeItem{Second bullet about Kafka pipelines}
\\section{Skills}
Go
\\end{document}`;

  it('does not mistake wrapped bullet text for a section header', async () => {
    const { scanSectionsInDoc } = await import('../src/diff/smart-replace');
    expect(scanSectionsInDoc(doc).map((s) => s.title)).toEqual(['Experience', 'Skills']);
  });

  it('keeps the preamble when the model returns only the body', () => {
    const rep = '\\begin{document}\n\\section{Experience}\nNew\n\\end{document}';
    const out = apply(doc, locateWrongSnippetInDoc(doc, rep), rep);
    expect(out).toContain('\\usepackage{enumitem}');
    expect(out.match(/\\begin\{document\}/g)?.length).toBe(1);
  });

  it('refuses a cut-off full document instead of duplicating the body', () => {
    const rep = '\\documentclass{article}\n\\begin{document}\n\\section{Experience}\nPartial';
    expect(locateWrongSnippetInDoc(doc, rep)).toBeNull();
  });

  it('drops a stray trailing \\end{document} from section output', () => {
    const rep = '\\section{Skills}\nGo, Rust\n\\end{document}';
    const out = apply(doc, locateWrongSnippetInDoc(doc, rep), rep);
    expect(out.match(/\\end\{document\}/g)?.length).toBe(1);
    expect(out).toContain('Go, Rust');
  });
});
