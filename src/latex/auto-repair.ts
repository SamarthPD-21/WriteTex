export const JAKES_RESUME_PREAMBLE = `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}
`;

export interface AutoRepairResult {
  repairedDoc: string;
  wasRepaired: boolean;
  repairsMade: string[];
}

/**
 * Scans a LaTeX document for broken macros, missing backslashes,
 * and missing preambles, and repairs them automatically.
 */
export function autoRepairLatexDocument(doc: string): AutoRepairResult {
  let text = doc;
  const repairsMade: string[] = [];

  // 1. Repair broken or truncated macros
  const macroReplacements: [RegExp, string, string][] = [
    [/^[ \t]*n\{/gm, '\\section{', 'Restored truncated \\section{'],
    [/^[ \t]*section\{/gm, '\\section{', 'Added missing backslash to \\section{'],
    [/(?<![\\a-zA-Z])(?:sumeSubheading|resumeSubheading)\b/g, '\\resumeSubheading', 'Repaired \\resumeSubheading'],
    [/(?<![\\a-zA-Z])(?:sumeItem|resumeItem)\{/g, '\\resumeItem{', 'Repaired \\resumeItem{'],
    [/(?<![\\a-zA-Z])(?:resumeItemListStart)\b/g, '\\resumeItemListStart', 'Repaired \\resumeItemListStart'],
    [/(?<![\\a-zA-Z])(?:resumeItemListEnd)\b/g, '\\resumeItemListEnd', 'Repaired \\resumeItemListEnd'],
    [/(?<![\\a-zA-Z])(?:SubHeadingListStart|resumeSubHeadingListStart)\b/g, '\\resumeSubHeadingListStart', 'Repaired \\resumeSubHeadingListStart'],
    [/(?<![\\a-zA-Z])(?:SubHeadingListEnd|resumeSubHeadingListEnd)\b/g, '\\resumeSubHeadingListEnd', 'Repaired \\resumeSubHeadingListEnd'],
    [/(?<![\\a-zA-Z])(?:resumeProjectHeading)\b/g, '\\resumeProjectHeading', 'Repaired \\resumeProjectHeading'],
    [/(?<![\\a-zA-Z])(?:xtit|textit)\{/g, '\\textit{', 'Repaired \\textit{'],
    // Bracket typos instead of braces: e.g. \underline[1696...}
    [/(?<![\\a-zA-Z])\\underline\[([^}\n]+)\}/g, '\\underline{$1}', 'Repaired \\underline[...} to \\underline{...}'],
    [/(?<![\\a-zA-Z])\\underline\[([^\]\n]+)\]/g, '\\underline{$1}', 'Repaired \\underline[...] to \\underline{...}'],
    [/(?<![\\a-zA-Z])\\textbf\[([^}\n]+)\}/g, '\\textbf{$1}', 'Repaired \\textbf[...} to \\textbf{...}'],
    [/(?<![\\a-zA-Z])\\textit\[([^}\n]+)\}/g, '\\textit{$1}', 'Repaired \\textit[...} to \\textit{...}'],
    [/(?<![\\a-zA-Z])\\emph\[([^}\n]+)\}/g, '\\emph{$1}', 'Repaired \\emph[...} to \\emph{...}'],
  ];

  for (const [regex, replacement, label] of macroReplacements) {
    if (regex.test(text)) {
      text = text.replace(regex, replacement);
      repairsMade.push(label);
    }
  }

  // 1.5. Fix runaway / unclosed \resumeItem{...} before another item or list end
  const unclosedItemRegex = /(\\resumeItem\{[^\n}]*?)(\r?\n\s*(?:\\resumeItem\{|\\resumeItemListEnd|\\end\{itemize\}))/g;
  if (unclosedItemRegex.test(text)) {
    text = text.replace(unclosedItemRegex, '$1}$2');
    repairsMade.push('Inserted missing "}" for unclosed \\resumeItem');
  }

  // 2. Check for missing preamble
  if (!text.includes('\\documentclass')) {
    if (text.includes('\\begin{document}')) {
      const beginIdx = text.indexOf('\\begin{document}');
      text = JAKES_RESUME_PREAMBLE + text.slice(beginIdx + '\\begin{document}'.length);
    } else {
      text = JAKES_RESUME_PREAMBLE + '\n' + text.trimStart();
    }
    repairsMade.push('Restored complete Jake\'s Resume preamble and macros');
  }

  // 3. Ensure \\end{document} is present
  if (text.includes('\\begin{document}') && !text.includes('\\end{document}')) {
    text = text.trimEnd() + '\n\n\\end{document}\n';
    repairsMade.push('Added missing \\end{document}');
  }

  return {
    repairedDoc: text,
    wasRepaired: repairsMade.length > 0,
    repairsMade,
  };
}
