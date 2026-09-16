import { describe, expect, it } from 'vitest';
import { locateWrongSnippetInDoc } from '../src/diff/smart-replace';
import { autoRepairLatexDocument } from '../src/latex/auto-repair';

describe('Smart Snippet Replacement Locator', () => {
  const sampleDoc = `\\documentclass{article}
\\begin{document}

\\section{Education}
\\textbf{University of Michigan} -- BS in CS

\\section{Experience}
sumeSubheading
{Software Engineer II --- Core Infrastructure}{New York, NY}
{FinTech Infrastructure Systems}{Jun 2019 -- Dec 2021}
resumeItemListStart
\\resumeItem{Designed high-throughput low-latency transaction processing APIs handling \\textbf{\\$50M+} daily transaction volume.}
\\resumeItem{Eliminated deadlocks and starvation across distributed transaction queues.}
resumeItemListEnd

resumeSubheading
{Software Engineer}{Seattle, WA}
{Cloud Logistics Engine}{Aug 2017 -- May 2019}
\\resumeItemListStart
\\resumeItem{Engineered asynchronous messaging queues with RabbitMQ.}
\\resumeItemListEnd

\\section{Projects}
\\resumeSubHeadingListStart
  \\resumeProjectHeading
    {\\textbf{Old Project} $|$ \\emph{Python}}{github.com/user/old}
    \\resumeItemListStart
      \\resumeItem{Old outdated bullet point.}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd

\\end{document}`;

  it('replaces active selection when user highlights the wrong snippet', () => {
    const wrongSnippet = 'sumeSubheading\n{Software Engineer II --- Core Infrastructure}{New York, NY}';
    const from = sampleDoc.indexOf(wrongSnippet);
    const to = from + wrongSnippet.length;

    const loc = locateWrongSnippetInDoc(sampleDoc, '\\resumeSubheading{Software Engineer II}{NY}', {
      activeSelection: {
        from,
        to,
        text: wrongSnippet,
        empty: false,
        cursor: to,
      },
    });

    expect(loc).toBeDefined();
    expect(loc?.reason).toBe('active_selection');
    expect(loc?.from).toBe(from);
    expect(loc?.to).toBe(to);
    expect(loc?.matchedText).toBe(wrongSnippet);
  });

  it('locates and replaces matching section rather than appending a duplicate section', () => {
    const newProjectsSection = `\\section{Projects}
\\resumeSubHeadingListStart
  \\resumeProjectHeading
    {\\textbf{New Distributed Cache} $|$ \\emph{Go, Raft}}{github.com/user/cache}
    \\resumeItemListStart
      \\resumeItem{Engineered Raft consensus engine.}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd`;

    const loc = locateWrongSnippetInDoc(sampleDoc, newProjectsSection);
    expect(loc).toBeDefined();
    expect(loc?.reason).toBe('section_match');

    // Should replace the existing \section{Projects} block up to \end{document}
    const matched = loc ? sampleDoc.slice(loc.from, loc.to) : '';
    expect(matched).toContain('\\section{Projects}');
    expect(matched).toContain('Old Project');
    expect(matched).not.toContain('\\section{Experience}');
  });

  it('replaces \\section{Selected Projects} when replacement has \\section{Projects}', () => {
    const docWithSelectedProjects = `\\documentclass{article}
\\begin{document}
\\section{Experience}
\\resumeSubheading{Company}{Dates}{Title}{Location}

\\section{Selected Projects}
\\resumeSubHeadingListStart
  \\resumeProjectHeading{\\textbf{Old Synthesis Engine}}{url}
  \\resumeItemListStart
    \\resumeItem{Old bullet.}
  \\resumeItemListEnd
\\resumeSubHeadingListEnd

\\section{Technical Skills}
\\begin{itemize}
\\item Languages: Java
\\end{itemize}
\\end{document}`;

    const newProjects = `\\section{Projects}
\\resumeSubHeadingListStart
  \\resumeProjectHeading{\\textbf{Grading-Annotation-Tool}}{GitHub}
\\resumeSubHeadingListEnd`;

    const loc = locateWrongSnippetInDoc(docWithSelectedProjects, newProjects);
    expect(loc).toBeDefined();
    expect(loc?.reason).toBe('section_match');

    const matched = loc ? docWithSelectedProjects.slice(loc.from, loc.to) : '';
    expect(matched).toContain('\\section{Selected Projects}');
    expect(matched).toContain('Old Synthesis Engine');
    expect(matched).not.toContain('\\section{Experience}');
    expect(matched).not.toContain('\\section{Technical Skills}');
  });

  it('replaces corrupted section header such as "elected Projects}" without backslash', () => {
    const docWithCorruptedHeader = `\\documentclass{article}
\\begin{document}
\\section{Experience}
\\resumeSubHeadingListEnd

elected Projects}
\\resumeSubHeadingListStart
  \\resumeProjectHeading{\\textbf{Old App}}{url}
\\resumeSubHeadingListEnd

\\section{Technical Skills}
\\end{document}`;

    const newProjects = `\\section{Projects}
\\resumeSubHeadingListStart
  \\resumeProjectHeading{\\textbf{New App}}{url}
\\resumeSubHeadingListEnd`;

    const loc = locateWrongSnippetInDoc(docWithCorruptedHeader, newProjects);
    expect(loc).toBeDefined();
    expect(loc?.reason).toBe('section_match');

    const matched = loc ? docWithCorruptedHeader.slice(loc.from, loc.to) : '';
    expect(matched).toContain('elected Projects}');
    expect(matched).toContain('Old App');
    expect(matched).not.toContain('\\section{Experience}');
  });

  it('replaces existing projects section even if replacement lacks \\section header', () => {
    const doc = `\\documentclass{article}
\\begin{document}
\\section{Experience}
...
\\section{Selected Projects}
\\resumeSubHeadingListStart
  \\resumeProjectHeading{\\textbf{Old App}}{url}
\\resumeSubHeadingListEnd
\\section{Technical Skills}
\\end{document}`;

    const projectBlockOnly = `\\resumeProjectHeading{\\textbf{New App}}{github.com/new}
\\resumeItemListStart
  \\resumeItem{New bullet.}
\\resumeItemListEnd`;

    const loc = locateWrongSnippetInDoc(doc, projectBlockOnly);
    expect(loc).toBeDefined();
    expect(loc?.reason).toBe('section_body_match');

    const matched = loc ? doc.slice(loc.from, loc.to) : '';
    expect(matched).toContain('Selected Projects');
    expect(matched).toContain('Old App');
  });

  it('locates broken block by content anchor even with corrupted macros', () => {
    const fixedExperienceBlock = `\\resumeSubheading
  {Software Engineer II --- Core Infrastructure}{New York, NY}
  {FinTech Infrastructure Systems}{Jun 2019 -- Dec 2021}
  \\resumeItemListStart
    \\resumeItem{Designed high-throughput low-latency transaction processing APIs handling \\textbf{\\$50M+} daily transaction volume.}
    \\resumeItem{Eliminated deadlocks and starvation across distributed transaction queues.}
  \\resumeItemListEnd`;

    const loc = locateWrongSnippetInDoc(sampleDoc, fixedExperienceBlock);
    expect(loc).toBeDefined();
    expect(loc?.reason).toBe('content_anchor');

    const matched = loc ? sampleDoc.slice(loc.from, loc.to) : '';
    expect(matched).toContain('sumeSubheading');
    expect(matched).toContain('{Software Engineer II --- Core Infrastructure}{New York, NY}');
    expect(matched).toContain('resumeItemListEnd');
  });

  it('locates preamble block when document has \\begin{document}', () => {
    const replacement = `\\documentclass[11pt]{article}
\\usepackage{fullpage}
\\begin{document}`;

    const loc = locateWrongSnippetInDoc(sampleDoc, replacement);
    expect(loc).toBeDefined();
    expect(loc?.reason).toBe('preamble');
    expect(loc?.from).toBe(0);
    expect(sampleDoc.slice(loc!.from, loc!.to)).toBe('\\documentclass{article}\n\\begin{document}');
  });
});

describe('LaTeX Auto-Repair Engine', () => {
  const corruptedDoc = `resumeItem{Instituted automated chaos engineering and canary deployment frameworks with ArgoCD.}
resumeItemListEnd

sumeSubheading
{Software Engineer II --- Core Infrastructure}{New York, NY}
{FinTech Infrastructure Systems}{Jun 2019 -- Dec 2021}
resumeItemListStart
\\resumeItem{Designed high-throughput transaction processing APIs.}
resumeItemListEnd

resumeSubheading
{Software Engineer}{Seattle, WA}`;

  it('repairs broken macros and missing preambles automatically', () => {
    const res = autoRepairLatexDocument(corruptedDoc);
    expect(res.wasRepaired).toBe(true);

    // Verify macros got backslashes restored
    expect(res.repairedDoc).toContain('\\resumeItem{Instituted automated chaos engineering');
    expect(res.repairedDoc).toContain('\\resumeItemListEnd');
    expect(res.repairedDoc).toContain('\\resumeSubheading\n{Software Engineer II');
    expect(res.repairedDoc).toContain('\\resumeItemListStart');

    // Verify preamble was restored
    expect(res.repairedDoc).toContain('\\documentclass[letterpaper,11pt]{article}');
    expect(res.repairedDoc).toContain('\\begin{document}');
    expect(res.repairedDoc).toContain('\\end{document}');
  });
});
