import { describe, it, expect } from 'vitest';
import { latexToPlainText, latexToMarkdown } from '../src/utils/export';

describe('Export Utilities', () => {
  const sampleLatex = `
    \\section{Experience}
    \\resumeSubheading{Software Engineer}{June 2023 -- Present}{Acme Corp}{San Francisco, CA}
    \\resumeItemListStart
      \\resumeItem{Architected high-throughput service in \\textbf{Go} handling 10M daily requests.}
      \\resumeItem{Reduced latency by 35\\% and saved \\$45k in cloud costs.}
    \\resumeItemListEnd
  `;

  it('converts LaTeX to readable Plain Text', () => {
    const plain = latexToPlainText(sampleLatex);
    expect(plain).toContain('=== EXPERIENCE ===');
    expect(plain).toContain('Software Engineer | June 2023 -- Present');
    expect(plain).toContain('• Architected high-throughput service in Go handling 10M daily requests.');
    expect(plain).toContain('35%');
    expect(plain).toContain('$45k');
    expect(plain).not.toContain('\\resumeItem');
    expect(plain).not.toContain('\\textbf');
  });

  it('converts LaTeX to clean Markdown', () => {
    const md = latexToMarkdown(sampleLatex);
    expect(md).toContain('## Experience');
    expect(md).toContain('**Software Engineer** — *June 2023 -- Present*');
    expect(md).toContain('- Architected high-throughput service in **Go** handling 10M daily requests.');
    expect(md).toContain('35%');
    expect(md).toContain('$45k');
    expect(md).not.toContain('\\resumeItem');
  });
});
