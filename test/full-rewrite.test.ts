import { describe, expect, it } from 'vitest';
import { locateWrongSnippetInDoc } from '../src/diff/smart-replace';
import { planEdit, structuralWarnings } from '../src/diff/edit-plan';
import { buildPrompt, findTemplatePlaceholders } from '../src/prompts/builder';
import { EditorContext } from '../src/messaging/types';

// Jake's-Resume-style template still holding its sample heading
const templateDoc = `\\documentclass{article}
\\begin{document}
\\begin{center}
    \\textbf{\\Huge \\scshape Jane Doe} \\\\ \\vspace{1pt}
    \\small 123-456-7890 $|$ \\href{mailto:jane@example.com}{\\underline{jane@example.com}}
\\end{center}

\\section{Education}
\\resumeSubHeadingListStart
  \\resumeSubheading{State University}{City, ST}{BS CS}{2018 -- 2022}
\\resumeSubHeadingListEnd

\\section{Experience}
\\resumeSubHeadingListStart
  \\resumeSubheading{Acme}{Remote}{Engineer}{2022 -- Present}
\\resumeSubHeadingListEnd

\\end{document}`;

// "Remake all the sections": heading + every section
const fullRewrite = `\\begin{center}
    \\textbf{\\Huge \\scshape Samarth Deshpande} \\\\ \\vspace{1pt}
    \\small +91 7899086600 $|$ \\href{mailto:s@gmail.com}{\\underline{s@gmail.com}}
\\end{center}

\\section{Education}
\\resumeSubHeadingListStart
  \\resumeSubheading{Scaler School of Technology}{Bangalore}{BS CS}{2024 -- Present}
\\resumeSubHeadingListEnd

\\section{Experience}
\\resumeSubHeadingListStart
  \\resumeSubheading{VeBlyss Global}{Remote}{Software Engineer}{2025}
\\resumeSubHeadingListEnd`;

const apply = (doc: string, rep: string) => {
  const loc = locateWrongSnippetInDoc(doc, rep)!;
  return doc.slice(0, loc.from) + (loc.replacementText ?? rep) + doc.slice(loc.to);
};

describe('Full-resume rewrites', () => {
  it('replaces the heading instead of adding a second one', () => {
    const out = apply(templateDoc, fullRewrite);
    expect(out).not.toContain('Jane Doe');
    expect(out.match(/\\begin\{center\}/g)?.length).toBe(1);
    expect(out.match(/\\section\{Education\}/g)?.length).toBe(1);
    expect(out.match(/\\section\{Experience\}/g)?.length).toBe(1);
    expect(out).toContain('Samarth Deshpande');
    expect(out).not.toContain('State University');
  });

  it('adds a heading when the document has none, above the first section', () => {
    const noHeading = templateDoc.replace(/\\begin\{center\}[\s\S]*?\\end\{center\}\n\n/, '');
    const out = apply(noHeading, fullRewrite);
    expect(out.match(/\\begin\{center\}/g)?.length).toBe(1);
    expect(out.indexOf('Samarth')).toBeLessThan(out.indexOf('\\section{Education}'));
  });

  it('keeps unrelated leading chatter from becoming a heading', () => {
    const out = apply(templateDoc, 'Updated:\n\\section{Experience}\n\\resumeSubHeadingListStart\n\\resumeSubHeadingListEnd');
    expect(out).toContain('Jane Doe');
  });
});

describe('Duplicate guard', () => {
  it('warns when an edit would duplicate a section or the heading', () => {
    const dup = templateDoc.replace('\\end{document}', '\\section{Experience}\nagain\n\\end{document}');
    expect(structuralWarnings(templateDoc, dup)[0]).toContain('duplicate sections: “experience”');
    const twoHeads = templateDoc.replace('\\section{Education}', '\\begin{center}X\\end{center}\n\\section{Education}');
    expect(structuralWarnings(templateDoc, twoHeads).join(' ')).toContain('two name/contact headings');
    expect(structuralWarnings(templateDoc, templateDoc)).toEqual([]);
  });

  it('attaches warnings to plans', () => {
    const plan = planEdit(templateDoc, fullRewrite, { fileName: 'main.tex' })!;
    expect(plan.warnings).toEqual([]);
  });
});

describe('Prompting for full rewrites', () => {
  it('flags template placeholders and treats an attached resume as the source of truth', () => {
    expect(findTemplatePlaceholders(templateDoc)).toEqual(expect.arrayContaining(['Jane Doe', '123-456-7890']));
    const built = buildPrompt('Remake all the sections with my details', {
      currentFileContent: templateDoc,
      attachedFiles: [
        {
          id: 'a',
          name: 'resume.pdf',
          type: 'pdf',
          size: 1,
          formattedSize: '1 KB',
          text: 'Samarth Deshpande s@gmail.com Experience VeBlyss Global Education Scaler School of Technology',
          charCount: 10,
          wordCount: 10,
          extractedAt: 0,
          isJobDescriptionCandidate: false,
        },
      ],
    } as EditorContext);
    expect(built.userPrompt).toContain('[TEMPLATE PLACEHOLDERS IN DOCUMENT]');
    expect(built.userPrompt).toContain("candidate's own resume");
    expect(built.userPrompt).toContain('each \\section exactly once');
    expect(built.systemPrompt).toContain('NO DUPLICATION');
  });
});
