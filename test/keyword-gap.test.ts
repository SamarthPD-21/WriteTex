import { describe, it, expect } from 'vitest';
import {
  extractKeywordsFromJD,
  stripLatexMarkup,
  analyzeKeywordGap,
} from '../src/analysis/keyword-gap';

describe('Keyword Gap Analysis', () => {
  it('extracts known tech keywords and acronyms from Job Description', () => {
    const jd = `
      We are seeking a Senior Backend Engineer with strong proficiency in Python, Go, and PostgreSQL.
      Experience with Kubernetes, Docker, CI/CD, AWS, and Microservices is required.
      Knowledge of Distributed Systems, Redis, and GraphQL is a huge plus.
    `;
    const keywords = extractKeywordsFromJD(jd);
    expect(keywords).toContain('python');
    expect(keywords).toContain('go');
    expect(keywords).toContain('postgresql');
    expect(keywords).toContain('kubernetes');
    expect(keywords).toContain('docker');
    expect(keywords).toContain('aws');
    expect(keywords).toContain('microservices');
    expect(keywords).toContain('distributed systems');
    expect(keywords).toContain('redis');
    expect(keywords).toContain('graphql');
  });

  it('strips LaTeX markup cleanly to plaintext tokens', () => {
    const latex = `
      \\section{Experience}
      \\resumeSubheading{Software Engineer}{Google}{2022--2024}{NY}
      \\resumeItemListStart
        \\resumeItem{Architected \\textbf{distributed systems} in \\emph{Go} and \\href{https://aws.com}{AWS}.}
      \\resumeItemListEnd
    `;
    const text = stripLatexMarkup(latex);
    expect(text).toContain('experience');
    expect(text).toContain('software engineer');
    expect(text).toContain('distributed systems');
    expect(text).toContain('go');
    expect(text).toContain('aws');
    expect(text).not.toContain('\\resumeItem');
    expect(text).not.toContain('\\textbf');
  });

  it('correctly matches existing resume keywords and highlights missing gaps', () => {
    const jd = 'Looking for an engineer experienced in Python, Kubernetes, Docker, Go, and Terraform.';
    const resumeLatex = `
      \\section{Technical Skills}
      \\resumeItem{Languages: Python, Go, SQL}
      \\resumeItem{DevOps: Docker, AWS}
    `;
    const result = analyzeKeywordGap(jd, resumeLatex, 'DevOps Engineer');

    expect(result.matchedKeywords).toContain('python');
    expect(result.matchedKeywords).toContain('go');
    expect(result.matchedKeywords).toContain('docker');

    expect(result.missingKeywords).toContain('kubernetes');
    expect(result.missingKeywords).toContain('terraform');

    expect(result.matchPercentage).toBeGreaterThanOrEqual(50);
    expect(result.matchPercentage).toBeLessThan(100);
    expect(result.suggestedPrompt).toContain('kubernetes');
    expect(result.suggestedPrompt).toContain('terraform');
  });
});
