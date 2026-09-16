import { EditorContext, DocumentMode } from '../messaging/types';
import { buildLatexContext } from '../latex/context-builder';
import { getSystemPrompt } from './system';

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

  const isExplanationOnly =
    presetKey === 'explain' ||
    /^(explain|what does|how does|why|describe)/i.test(userQuery.trim());

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
        githubSection += `  Verified Tech Stack: ${project.verifiedTechStack.join(', ')}\n`;
      }
      if (project.manifestDependencies && project.manifestDependencies.length > 0) {
        githubSection += `  Verified Dependencies: ${project.manifestDependencies.join(', ')}\n`;
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
    githubSection += `NOTE: Strictly adhere to the verified technologies listed above. Do NOT invent or guess unverified frameworks (such as Spring Boot, Django, etc.).\n\n`;
  }

  const isErrorFixing =
    presetKey === 'fix_errors' ||
    Boolean(context.hasNoPdf) ||
    Boolean(context.overleafErrors && context.overleafErrors.length > 0) ||
    /^(fix|repair|debug|solve|compile|no pdf)\b/i.test(userQuery.trim()) ||
    /error|emergency stop|undefined control sequence|runaway argument|no legal \\end/i.test(userQuery);

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
  let attachmentsSection = '';
  if (context.attachedFiles && context.attachedFiles.length > 0) {
    attachmentsSection += `[ATTACHED REFERENCE DOCUMENTS]\n`;
    attachmentsSection += `The user has attached ${context.attachedFiles.length} document(s) for reference:\n\n`;
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
    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

${codeHeader}
${context.selectedText}

[USER INSTRUCTION]
${userQuery}

(Note: Return ONLY the raw replacement LaTeX snippet for the selected code. Be concise for high-speed generation.)`;
  } else if (context.currentFileContent && context.currentFileContent.trim().length > 0) {
    // When no selection is made, supply document code so the model can pinpoint errors or target sections
    const doc = context.currentFileContent.trim();
    const docSnippet = doc.length <= 10000 ? doc : doc.slice(0, 10000);

    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}
${context.currentLineNumber ? `Active line: ${context.currentLineNumber}` : ''}

[DOCUMENT CODE]
${docSnippet}

[USER INSTRUCTION]
${userQuery}

(Note: Return ONLY the targeted LaTeX snippet or section to replace. Do NOT reprint the full document if only fixing an error or updating a section. Be fast and concise.)`;
  } else if (context.currentLineText) {
    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}
Current line (${context.currentLineNumber || 1}): ${context.currentLineText}

[USER INSTRUCTION]
${userQuery}

(Note: Return ONLY the replacement LaTeX snippet. Be concise.)`;
  } else {
    fullUserPrompt = `${errorSection}${targetHeader}${githubSection}${attachmentsSection}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

[USER INSTRUCTION]
${userQuery}`;
  }

  return {
    systemPrompt: getSystemPrompt(effectiveDocMode, isErrorFixing),
    userPrompt: fullUserPrompt,
    isExplanationOnly,
    detectedDocMode: effectiveDocMode,
  };
}

/**
 * Strips accidental markdown code fences (```latex ... ```) if the model emitted them,
 * ensuring raw LaTeX for seamless diff and patch operations.
 */
export function cleanModelOutput(rawOutput: string): string {
  let text = rawOutput.trim();

  // Strip leading code fence: ```latex or ```tex or ```
  const fenceStartMatch = text.match(/^```(?:latex|tex)?\r?\n/i);
  if (fenceStartMatch) {
    text = text.slice(fenceStartMatch[0].length);
  }

  // Strip trailing code fence: ```
  if (text.endsWith('```')) {
    text = text.slice(0, -3).trimEnd();
  }

  return text;
}
