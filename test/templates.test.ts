import { describe, it, expect } from 'vitest';
import { LATEX_TEMPLATES } from '../src/templates/latex-templates';
import { validateLatex } from '../src/latex/validator';

describe('LaTeX Template Library', () => {
  it('contains valid resume and cover letter templates', () => {
    expect(LATEX_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    const jake = LATEX_TEMPLATES.find((t) => t.id === 'template_jakes_resume');
    expect(jake).toBeDefined();
    expect(jake?.fullLatex).toContain('\\documentclass');
    expect(jake?.fullLatex).toContain('\\begin{document}');
    expect(jake?.fullLatex).toContain('\\end{document}');

    const coverLetter = LATEX_TEMPLATES.find((t) => t.category === 'cover_letter');
    expect(coverLetter).toBeDefined();
    expect(coverLetter?.fullLatex).toContain('\\documentclass');
  });

  it('templates pass LaTeX brace balance validation', () => {
    for (const t of LATEX_TEMPLATES) {
      const res = validateLatex(t.fullLatex);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    }
  });
});
