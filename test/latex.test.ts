import { describe, expect, it } from 'vitest';
import { parseLatex } from '../src/latex/parser';
import { validateLatex } from '../src/latex/validator';
import { buildLatexContext } from '../src/latex/context-builder';

describe('LaTeX Parser', () => {
  it('extracts documentclass, packages, sections, citations, and labels', () => {
    const sample = `
      \\documentclass[12pt,journal]{IEEEtran}
      \\usepackage{amsmath,graphicx}
      \\usepackage{cite}

      \\begin{document}
      \\section{Introduction}
      \\label{sec:intro}
      Deep neural networks have shown success \\cite{lecun2015,vaswani2017}.

      \\subsection{Background}
      \\begin{equation}
      E = mc^2 \\label{eq:einstein}
      \\end{equation}

      As shown in Eq. \\eqref{eq:einstein}.
      \\end{document}
    `;

    const parsed = parseLatex(sample);

    expect(parsed.documentClass).toBe('IEEEtran');
    expect(parsed.packages).toContain('amsmath');
    expect(parsed.packages).toContain('graphicx');
    expect(parsed.packages).toContain('cite');

    expect(parsed.sections.length).toBe(2);
    expect(parsed.sections[0].title).toBe('Introduction');
    expect(parsed.sections[0].level).toBe('section');
    expect(parsed.sections[1].title).toBe('Background');
    expect(parsed.sections[1].level).toBe('subsection');

    expect(parsed.citations.length).toBe(1);
    expect(parsed.citations[0].keys).toEqual(['lecun2015', 'vaswani2017']);

    expect(parsed.labels.map((l) => l.name)).toContain('sec:intro');
    expect(parsed.labels.map((l) => l.name)).toContain('eq:einstein');

    expect(parsed.refs.map((r) => r.target)).toContain('eq:einstein');
  });
});

describe('LaTeX Validator', () => {
  it('passes on valid LaTeX code', () => {
    const validCode = '\\begin{equation}\n  y = mx + b\n\\end{equation}';
    const result = validateLatex(validCode);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects unclosed curly braces', () => {
    const brokenCode = '\\textbf{Unfinished text without closing brace';
    const result = validateLatex(brokenCode);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Unclosed curly brace'))).toBe(true);
  });

  it('detects mismatched environments', () => {
    const brokenCode = '\\begin{align}\n  x = 1\n\\end{equation}';
    const result = validateLatex(brokenCode);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Mismatched environments'))).toBe(true);
  });

  it('detects unclosed environments', () => {
    const brokenCode = '\\begin{figure}\n  \\centering\n  Missing end';
    const result = validateLatex(brokenCode);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Unclosed environment'))).toBe(true);
  });
});

describe('LaTeX Context Builder', () => {
  it('correctly associates snippet with enclosing section and environment', () => {
    const doc = `
      \\documentclass{article}
      \\usepackage{amsmath}
      \\begin{document}
      \\section{Methodology}
      Our method operates as follows:
      \\begin{equation}
        L_{total} = L_{rec} + \\lambda L_{adv}
      \\end{equation}
      \\end{document}
    `;

    const snippet = 'L_{total} = L_{rec} + \\lambda L_{adv}';
    const ctx = buildLatexContext(doc, snippet, 'methods.tex');

    expect(ctx.fileName).toBe('methods.tex');
    expect(ctx.documentClass).toBe('article');
    expect(ctx.relevantPackages).toContain('amsmath');
    expect(ctx.enclosingSection).toBe('section: Methodology');
    expect(ctx.surroundingEnvironment).toBe('equation');
  });
});

describe('LaTeX Auto-Repair', () => {
  it('repairs bracket typos like \\underline[...] and truncated macros', async () => {
    const { autoRepairLatexDocument } = await import('../src/latex/auto-repair');
    const broken = `
      \\begin{document}
      section{Experience}
      \\resumeSubheading{Google}{SWE}
      \\resumeItemListStart
        \\resumeItem{Built feature with \\underline[1696 (3-Star)}}
      \\resumeItemListEnd
      \\end{document}
    `;

    const result = autoRepairLatexDocument(broken);
    expect(result.wasRepaired).toBe(true);
    expect(result.repairedDoc).toContain('\\section{Experience}');
    expect(result.repairedDoc).toContain('\\underline{1696 (3-Star)}');
    expect(result.repairedDoc).toContain('\\documentclass');
  });
});
