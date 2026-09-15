import { EditorContext } from '../messaging/types';
import { buildLatexContext } from '../latex/context-builder';
import { BASE_SYSTEM_PROMPT } from './system';

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  isExplanationOnly: boolean;
}

/**
 * Constructs the final system and user prompts with enriched LaTeX context.
 */
export function buildPrompt(
  userQuery: string,
  context: EditorContext,
  presetKey?: string
): BuiltPrompt {
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

  let fullUserPrompt = '';

  if (context.selectedText && context.selectedText.trim().length > 0) {
    fullUserPrompt = `[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

[SELECTED LATEX CODE]
${context.selectedText}

[USER INSTRUCTION]
${userQuery}`;
  } else if (context.currentLineText) {
    fullUserPrompt = `[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}
Current line (${context.currentLineNumber || 1}): ${context.currentLineText}

[USER INSTRUCTION]
${userQuery}`;
  } else {
    fullUserPrompt = `[LATEX CONTEXT]
${contextDescription ? contextDescription : 'None specified.'}

[USER INSTRUCTION]
${userQuery}`;
  }

  return {
    systemPrompt: BASE_SYSTEM_PROMPT,
    userPrompt: fullUserPrompt,
    isExplanationOnly,
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
