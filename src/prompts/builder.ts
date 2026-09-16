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

  let codeHeader = '[SELECTED LATEX CODE]';
  if (effectiveDocMode === 'cover_letter' && context.selectedText) {
    codeHeader = '[CANDIDATE RESUME EXPERIENCE / BACKGROUND]';
  }

  let fullUserPrompt = '';

  if (context.selectedText && context.selectedText.trim().length > 0) {
    fullUserPrompt = `${targetHeader}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

${codeHeader}
${context.selectedText}

[USER INSTRUCTION]
${userQuery}`;
  } else if (context.currentLineText) {
    fullUserPrompt = `${targetHeader}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}
Current line (${context.currentLineNumber || 1}): ${context.currentLineText}

[USER INSTRUCTION]
${userQuery}`;
  } else {
    fullUserPrompt = `${targetHeader}[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

[USER INSTRUCTION]
${userQuery}`;
  }

  return {
    systemPrompt: getSystemPrompt(effectiveDocMode),
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
