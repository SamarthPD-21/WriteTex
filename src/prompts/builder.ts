import { EditorContext, DocumentMode } from '../messaging/types';
import { buildLatexContext } from '../latex/context-builder';
import { getSystemPrompt } from './system';
import { analyzeKeywordGap } from '../analysis/keyword-gap';
import { isExplanationQuery } from './intent';

export { isExplanationQuery };

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  isExplanationOnly: boolean;
  detectedDocMode: DocumentMode;
}

/**
 * Determines whether the current context is a resume, cover letter, or general document.
 */
export function detectDocumentMode(
  context: EditorContext,
  userQuery: string,
  presetKey?: string
): DocumentMode {
  if (context.docMode) {
    return context.docMode;
  }

  const queryLower = userQuery.toLowerCase();
  const fileLower = (context.currentFileName || '').toLowerCase();
  const fullDoc = context.currentFileContent || '';

  if (
    presetKey?.startsWith('cl_') ||
    queryLower.includes('cover letter') ||
    fileLower.includes('cover') ||
    fileLower.includes('letter') ||
    fullDoc.includes('\\opening{') ||
    fullDoc.includes('\\closing{') ||
    fullDoc.includes('\\documentclass{letter}')
  ) {
    return 'cover_letter';
  }

  return 'resume';
}

/**
 * Constructs the final system and user prompts with enriched LaTeX context.
 */
export function buildPrompt(
  userQuery: string,
  context: EditorContext,
  presetKey?: string
): BuiltPrompt {
  const effectiveDocMode = detectDocumentMode(context, userQuery, presetKey);

  const latexContext = buildLatexContext(
    context.currentFileContent,
    context.selectedText,
    context.currentFileName
  );

  const isExplanationOnly = isExplanationQuery(userQuery, presetKey);

  let contextDescription = '';
  if (latexContext.fileName) {
    contextDescription += `Current file: ${latexContext.fileName}\n`;
  }
  if (latexContext.documentClass) {
    contextDescription += `Document class: \\documentclass{${latexContext.documentClass}}\n`;
  }
  if (latexContext.enclosingSection) {
    contextDescription += `Enclosing section: ${latexContext.enclosingSection}\n`;
  }
  if (latexContext.surroundingEnvironment) {
    contextDescription += `Inside environment: \\begin{${latexContext.surroundingEnvironment}}\n`;
  }
  if (latexContext.relevantPackages.length > 0) {
    contextDescription += `Loaded packages: ${latexContext.relevantPackages.join(', ')}\n`;
  }
  if (latexContext.definedCitations.length > 0) {
    contextDescription += `Available citations in document: ${latexContext.definedCitations.slice(0, 10).join(', ')}\n`;
  }

  // Target role, company, and JD context
  let targetHeader = '';
  if (context.targetRole || context.targetCompany) {
    targetHeader += `[TARGET POSITION]\n`;
    if (context.targetCompany) {
      targetHeader += `Company: ${context.targetCompany}\n`;
    }
    if (context.targetRole) {
      targetHeader += `Role: ${context.targetRole}\n`;
    }
    targetHeader += '\n';
  }

  if (context.jobDescription && context.jobDescription.trim().length > 0) {
    targetHeader += `[JOB DESCRIPTION / KEY REQUIREMENTS]\n${context.jobDescription.trim()}\n\n`;
  }

  // Tell the model which JD keywords the resume lacks, so tailoring is targeted instead of generic
  if (
    effectiveDocMode === 'resume' &&
    context.jobDescription &&
    context.jobDescription.trim().length > 0 &&
    context.currentFileContent
  ) {
    const gap = analyzeKeywordGap(context.jobDescription, context.currentFileContent);
    if (gap.totalJdKeywords > 0) {
      targetHeader += `[KEYWORD GAP ANALYSIS]\n`;
      targetHeader += `Resume already covers ${gap.matchedKeywords.length}/${gap.totalJdKeywords} job keywords.\n`;
      if (gap.missingKeywords.length > 0) {
        targetHeader += `Missing from resume (most important first): ${gap.missingKeywords.slice(0, 12).join(', ')}\n`;
        targetHeader += `Only work a missing keyword in where the candidate's existing experience, projects, or attached documents genuinely support it. Never add a skill the candidate has not demonstrated.\n`;
      }
      targetHeader += '\n';
    }
  }

  // GitHub analyzed projects context
  let githubSection = '';
  if (context.githubAnalysis && context.githubAnalysis.topProjects && context.githubAnalysis.topProjects.length > 0) {
    githubSection += `[CANDIDATE TOP GITHUB PROJECTS & OPEN SOURCE WORK]\n`;
    githubSection += `GitHub Profile: ${context.githubAnalysis.profileUrl} (@${context.githubAnalysis.username})\n`;
    if (context.githubAnalysis.topLanguages && context.githubAnalysis.topLanguages.length > 0) {
      githubSection += `Top Languages: ${context.githubAnalysis.topLanguages.slice(0, 5).map((l) => `${l.language} (${l.count})`).join(', ')}\n`;
    }
    githubSection += `Featured Projects (ranked for target role):\n`;

    const selectedProjects = context.githubAnalysis.topProjects.filter((p) => p.selected !== false);
    const projectsToFormat = selectedProjects.length > 0 ? selectedProjects : context.githubAnalysis.topProjects.slice(0, 3);

    for (const project of projectsToFormat) {
      githubSection += `- **${project.name}** (${project.url})\n`;
      githubSection += `  Primary Language: ${project.language} | Stars: ${project.stars} | Forks: ${project.forks}\n`;
      if (project.verifiedTechStack && project.verifiedTechStack.length > 0) {
        githubSection += `  Verified Tech Stack: ${project.verifiedTechStack.slice(0, 4).join(', ')}\n`;
      }
      if (project.manifestDependencies && project.manifestDependencies.length > 0) {
        githubSection += `  Verified Dependencies: ${project.manifestDependencies.slice(0, 4).join(', ')}\n`;
      }
      if (project.readmeSummary) {
        githubSection += `  Verified Project Summary: ${project.readmeSummary}\n`;
      } else if (project.description) {
        githubSection += `  Description: ${project.description}\n`;
      }
      if (project.topics && project.topics.length > 0) {
        githubSection += `  Topics: ${project.topics.join(', ')}\n`;
      }
      if (project.roleMatchReason) {
        githubSection += `  Role Relevance: ${project.roleMatchReason}\n`;
      }
    }
    githubSection += `NOTE: Strictly adhere to the verified technologies listed above. Do NOT invent or guess unverified frameworks (such as Spring Boot, Django, etc.).\n`;
    githubSection += `CRITICAL FORMATTING: In \\resumeProjectHeading{\\textbf{...} $|$ \\emph{Tech Stack}}, strictly cap the tech stack in \\emph{...} to 3-4 core technologies maximum (e.g. \\emph{Java, Spring Boot, Oracle DB}). Never dump 5+ tools or laundry-list utilities into the heading or bullets!\n\n`;
  }

  const isErrorFixing =
    presetKey === 'fix_errors' ||
    Boolean(context.hasNoPdf) ||
    Boolean(context.overleafErrors && context.overleafErrors.length > 0) ||
    /^(fix|repair|debug|solve|compile|no pdf)\b/i.test(userQuery.trim()) ||
    /\b(?:latex|compil\w*|overleaf|build|syntax)\s+(?:errors?|failures?|issues?)\b|\b(?:fix|resolve|repair)\b[^.]*\berrors?\b|emergency stop|undefined control sequence|runaway argument|no legal \\end|missing \$ inserted|no pdf/i.test(
      userQuery
    );

  let errorSection = '';
  if (context.hasNoPdf || (context.overleafErrors && context.overleafErrors.length > 0)) {
    errorSection += `[OVERLEAF COMPILER ERRORS & BUILD LOG]\n`;
    if (context.hasNoPdf) {
      errorSection += `Status: "No PDF" produced by LaTeX compiler (fatal compilation failure)\n`;
    }
    if (context.overleafErrors && context.overleafErrors.length > 0) {
      for (const err of context.overleafErrors.slice(0, 6)) {
        errorSection += `- [${err.type.toUpperCase()}] ${err.title}\n`;
        if (err.message && err.message !== err.title) {
          errorSection += `  Details: ${err.message}\n`;
        }
        if (err.line) {
          errorSection += `  Line: ${err.line}\n`;
        }
      }
    }
    errorSection += '\n';
  }

  // Attached files (PDF, TXT, MD, TEX) context
  // Sample content left over from a template (Jake's Resume and generic placeholders)
  let templateSection = '';
  const placeholders = findTemplatePlaceholders(context.currentFileContent || '');
  if (placeholders.length > 0) {
    templateSection =
      `[TEMPLATE PLACEHOLDERS IN DOCUMENT]\n` +
      `The document still contains sample template content: ${placeholders.join(', ')}.\n` +
      `Replace every placeholder (heading, contact details, sample entries) with the candidate's real details from the attached documents or their instruction. ` +
      `Never keep sample entries next to real ones, and never output a second heading. If a real detail is unknown, leave that line out rather than keeping the sample.\n\n`;
  }

  let attachmentsSection = '';
  if (context.attachedFiles && context.attachedFiles.length > 0) {
    attachmentsSection += `[ATTACHED REFERENCE DOCUMENTS]\n`;
    attachmentsSection += `The user has attached ${context.attachedFiles.length} document(s) for reference:\n`;
    if (context.attachedFiles.some((f) => looksLikeResume(f.text))) {
      attachmentsSection += `At least one attachment is the candidate's own resume: treat it as the source of truth for names, employers, titles, dates, links, and numbers. Use its real figures instead of placeholders.\n`;
    }
    attachmentsSection += `\n`;
    for (const file of context.attachedFiles) {
      const pageInfo = file.pageCount ? ` (${file.pageCount} pages, ${file.formattedSize})` : ` (${file.formattedSize})`;
      attachmentsSection += `--- BEGIN ATTACHED FILE: ${file.name}${pageInfo} ---\n`;
      const fileText =
        file.text.length > 30000
          ? `${file.text.slice(0, 30000)}\n[...truncated due to length...]`
          : file.text;
      attachmentsSection += `${fileText}\n`;
      attachmentsSection += `--- END ATTACHED FILE: ${file.name} ---\n\n`;
    }
  }

  let codeHeader = '[SELECTED LATEX CODE]';
  if (effectiveDocMode === 'cover_letter' && context.selectedText) {
    codeHeader = '[CANDIDATE RESUME EXPERIENCE / BACKGROUND]';
  }

  let fullUserPrompt = '';

  if (context.selectedText && context.selectedText.trim().length > 0) {
    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${templateSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

${codeHeader}
${context.selectedText}

[USER INSTRUCTION]
${userQuery}

(Note: Return ONLY the raw replacement LaTeX snippet for the selected code. Be concise for high-speed generation.)`;
  } else if (context.currentFileContent && context.currentFileContent.trim().length > 0) {
    // When no selection is made, supply document code so the model can pinpoint errors or target sections
    const docSnippet = selectDocumentExcerpt(context.currentFileContent.trim(), isErrorFixing);

    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${templateSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}
${context.currentLineNumber ? `Active line: ${context.currentLineNumber}` : ''}

[DOCUMENT CODE]
${docSnippet}

[USER INSTRUCTION]
${userQuery}

(Note: Return ONLY the targeted LaTeX to replace — never the full document unless asked. Your output is matched back into the document automatically, so shape it as follows:
- Rewriting a whole section: include its \\section{...} header line.
- Rewriting one or more jobs/projects: return each complete entry starting at its \\resumeSubheading / \\resumeProjectHeading, keeping the company or project name exactly as written.
- Rewriting individual bullets: return only those \\resumeItem{...} / \\item lines, one per line, in their original order.
- Rewriting the whole resume or several sections: return the heading block (name and contact line) once, then each \\section exactly once, in the document's order. Never output any section, entry, or the heading twice, and never output the preamble or \\begin{document}.
- Omit anything you did not change.)`;
  } else if (context.currentLineText) {
    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${templateSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}
Current line (${context.currentLineNumber || 1}): ${context.currentLineText}

[USER INSTRUCTION]
${userQuery}

(Note: Return ONLY the replacement LaTeX snippet. Be concise.)`;
  } else {
    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${templateSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

[USER INSTRUCTION]
${userQuery}`;
  }

  if (isExplanationOnly) {
    fullUserPrompt = fullUserPrompt.replace(
      /\(Note: Return ONLY[\s\S]*\)$/,
      '(Note: This is a question. Answer it directly and concisely in plain prose — short LaTeX examples are fine, but do not rewrite the document.)'
    );
  }

  return {
    systemPrompt: getSystemPrompt(effectiveDocMode, isErrorFixing),
    userPrompt: fullUserPrompt,
    isExplanationOnly,
    detectedDocMode: effectiveDocMode,
  };
}

// Distinctive sample text from Jake's Resume and generic resume templates
const TEMPLATE_PLACEHOLDERS: [RegExp, string][] = [
  [/\bJane Doe\b/, 'Jane Doe'],
  [/\bJohn Doe\b/, 'John Doe'],
  [/\bJake Ryan\b/, 'Jake Ryan'],
  [/[\w.]+@example\.com/, 'an @example.com email'],
  [/jake@su\.edu/, 'jake@su.edu'],
  [/123-456-7890/, '123-456-7890'],
  [/linkedin\.com\/in\/(?:jake|janedoe|johndoe)\b/, 'a sample LinkedIn URL'],
  [/github\.com\/(?:jake|janedoe|johndoe)\b/, 'a sample GitHub URL'],
  [/Southwestern University/, 'Southwestern University'],
  [/Blinn College/, 'Blinn College'],
  [/Gitlytics/, 'Gitlytics'],
  [/Simple Paintball/, 'Simple Paintball'],
  [/Undergraduate Research Assistant/, 'Undergraduate Research Assistant (sample role)'],
  [/Texas A&M|Southwestern University|Georgetown, TX/, 'sample locations'],
  [/Lorem ipsum/i, 'lorem ipsum text'],
];

export function findTemplatePlaceholders(doc: string): string[] {
  return [...new Set(TEMPLATE_PLACEHOLDERS.filter(([re]) => re.test(doc)).map(([, label]) => label))];
}

/** Heuristic: text with contact details plus experience/education reads as a resume. */
function looksLikeResume(text: string): boolean {
  const lower = text.toLowerCase();
  return /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text) && /experience|employment/.test(lower) && /education|university|college|school/.test(lower);
}

const DOCUMENT_EXCERPT_LIMIT = 24000;

/**
 * Picks the part of the document to show the model. Long preambles (Jake's
 * Resume is ~3k chars of macro definitions) are summarized so the budget goes to
 * the content being edited; error fixing keeps the preamble because that is
 * often where the error is.
 */
export function selectDocumentExcerpt(doc: string, keepPreamble: boolean): string {
  if (doc.length <= DOCUMENT_EXCERPT_LIMIT) return doc;

  const beginIdx = doc.indexOf('\\begin{document}');
  if (keepPreamble || beginIdx === -1) {
    return `${doc.slice(0, DOCUMENT_EXCERPT_LIMIT)}\n% [...document truncated...]`;
  }

  const preamble = doc.slice(0, beginIdx);
  const macros = Array.from(
    new Set(Array.from(preamble.matchAll(/\\(?:re)?newcommand\*?\s*\{?(\\[a-zA-Z@]+)/g), (m) => m[1]))
  );
  const header =
    `% [Preamble omitted (${preamble.length} chars).` +
    (macros.length > 0 ? ` Custom macros it defines: ${macros.slice(0, 25).join(', ')}` : '') +
    ']\n';

  const body = doc.slice(beginIdx);
  const budget = DOCUMENT_EXCERPT_LIMIT - header.length;
  return header + (body.length <= budget ? body : `${body.slice(0, budget)}\n% [...document truncated...]`);
}

const CHATTER_START = /^(?:here(?:'s| is| are)|sure|certainly|of course|below is|okay|ok|great)\b[^\n]*:\s*$/i;
const CHATTER_END = /^(?:let me know|i(?:'ve| have) |this (?:version|revision|update)|these changes|note:|feel free)/i;

/**
 * Strips accidental markdown code fences (```latex ... ```) and conversational
 * wrapper lines ("Here is the revised text:", "Let me know if...") if the model
 * emitted them, ensuring raw LaTeX for seamless diff and patch operations.
 * Real explanations (substantial prose, several code blocks) are left intact.
 */
export function cleanModelOutput(rawOutput: string): string {
  let text = rawOutput.trim();

  // A single fenced block surrounded by a line or two of chatter: keep only the block
  const fences = text.match(/```/g) || [];
  if (fences.length === 2) {
    const fenced = text.match(/^([\s\S]*?)```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)\r?\n?```([\s\S]*)$/);
    if (fenced) {
      const isShortWrapper = (part: string, maxLines: number) => {
        const partLines = part.split('\n').filter((l) => l.trim());
        return partLines.length <= maxLines && partLines.every((l) => l.trim().length <= 120);
      };
      if (isShortWrapper(fenced[1], 1) && isShortWrapper(fenced[3], 2)) {
        return fenced[2].trim();
      }
    }
  }

  // Strip leading code fence: ```latex or ```tex or ``` (also when output was cut off)
  const fenceStartMatch = text.match(/^```(?:latex|tex)?[ \t]*\r?\n/i);
  if (fenceStartMatch) {
    text = text.slice(fenceStartMatch[0].length);
  }

  // Strip trailing code fence: ```
  if (text.endsWith('```')) {
    text = text.slice(0, -3).trimEnd();
  }

  // Unfenced chatter lines around LaTeX output
  const lines = text.split('\n');
  if (lines.length > 1 && CHATTER_START.test(lines[0].trim()) && /^\s*[\\%]/.test(lines.slice(1).join('\n').trim())) {
    lines.shift();
  }
  while (lines.length > 1 && CHATTER_END.test(lines[lines.length - 1].trim()) && /[\\}]/.test(lines.slice(0, -1).join('\n'))) {
    lines.pop();
  }

  return lines.join('\n').trim();
}
