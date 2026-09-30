import { describe, expect, it } from 'vitest';
import { scoreAtsReadiness, unicodeMappingPatch } from '../src/analysis/ats-score';

const good = `\\documentclass{article}
\\input{glyphtounicode}
\\pdfgentounicode=1
\\begin{document}
Jane Doe | +1 555 123 4567 | jane@doe.dev | linkedin.com/in/janedoe
\\section{Education}
State University, BS Computer Science
\\section{Experience}
\\resumeItem{Built a Kafka ingestion service in Go handling 2M events per day}
\\resumeItem{Reduced p99 API latency by 40\\% by adding a Redis cache}
\\resumeItem{Led a team of 3 engineers to migrate services to Kubernetes on AWS}
\\section{Skills}
Go, Python, PostgreSQL, Kafka, Kubernetes, AWS, Redis
\\end{document}`;

const bad = `\\documentclass{article}
\\usepackage{fontawesome5}
\\usepackage{multicol}
\\begin{document}
Jane Doe \\faPhone
\\section{Where I've Been}
\\resumeItem{Responsible for the billing service and helped with on-call}
\\resumeItem{Worked on various backend tasks for the platform team}
\\resumeItem{Improved deploy speed by \\textbf{[X\\%]} using caching}
\\end{document}`;

describe('ATS readiness score', () => {
  it('scores a clean, targeted resume highly', () => {
    const r = scoreAtsReadiness({ latex: good, jobDescription: 'Required: Go, Kafka, Kubernetes, AWS and PostgreSQL experience.', targetRole: 'Backend Engineer' });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.rating).toBe('Strong');
    expect(r.issues.filter((i) => i.severity === 'critical')).toEqual([]);
  });

  it('flags parsing, structure, and content problems with fixes', () => {
    const r = scoreAtsReadiness({ latex: bad });
    const ids = r.issues.map((i) => i.id);
    for (const id of ['unicode-mapping', 'icons', 'columns', 'missing-experience', 'unusual-headings', 'no-email', 'placeholders', 'weak-phrases']) {
      expect(ids).toContain(id);
    }
    expect(r.score).toBeLessThan(50);
    expect(r.issues[0].severity).toBe('critical');
    expect(r.issues.find((i) => i.id === 'unicode-mapping')?.fix).toEqual({ kind: 'patch', label: 'Add unicode mapping', patch: 'unicode-mapping' });
    expect(r.issues.find((i) => i.id === 'weak-phrases')?.fix?.kind).toBe('ai');
  });

  it('skips keyword scoring without a job description and reweights the rest', () => {
    const r = scoreAtsReadiness({ latex: good });
    expect(r.keywordsSkipped).toBe(true);
    const total = r.categories.reduce((n, c) => n + c.weight, 0);
    expect(total).toBeCloseTo(1);
    expect(r.categories.find((c) => c.id === 'keywords')!.weight).toBe(0);
  });

  it('weights required keywords above nice-to-haves', () => {
    const jdRequiredMissing = 'Required: Rust and Terraform expertise.\nNice to have: Go.';
    const jdNiceMissing = 'Required: Go expertise.\nNice to have: Rust, Terraform.';
    const a = scoreAtsReadiness({ latex: good, jobDescription: jdRequiredMissing });
    const b = scoreAtsReadiness({ latex: good, jobDescription: jdNiceMissing });
    expect(b.stats.keywordPercent!).toBeGreaterThan(a.stats.keywordPercent!);
  });

  it('builds the unicode-mapping patch only when needed', () => {
    const patch = unicodeMappingPatch(bad)!;
    expect(patch.insert).toBe('\\input{glyphtounicode}\n\\pdfgentounicode=1\n\n');
    expect(bad.slice(patch.at).startsWith('\\begin{document}')).toBe(true);
    expect(unicodeMappingPatch(good)).toBeNull();
  });
});
