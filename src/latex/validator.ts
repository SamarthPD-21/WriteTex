import { parse } from '@unified-latex/unified-latex-util-parse';

export interface LatexValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates LaTeX snippets for structural integrity:
 * - Balanced curly braces (ignoring escaped \{ and \})
 * - Balanced environment pairs \begin{env} ... \end{env}
 * - Balanced math delimiters $...$
 * - AST parser check
 */
export function validateLatex(code: string): LatexValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check balanced curly braces
  let braceCount = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : '';

    if (char === '{' && prevChar !== '\\') {
      braceCount++;
    } else if (char === '}' && prevChar !== '\\') {
      braceCount--;
      if (braceCount < 0) {
        errors.push('Unmatched closing curly brace "}" detected.');
        break;
      }
    }
  }
  if (braceCount > 0) {
    errors.push(`Unclosed curly brace: ${braceCount} opening brace(s) without matching closing "}".`);
  }

  // 2. Check balanced environments \begin{...} and \end{...}
  const beginRegex = /\\begin\{([a-zA-Z0-9*]+)\}/g;
  const endRegex = /\\end\{([a-zA-Z0-9*]+)\}/g;

  const envStack: string[] = [];
  const combinedTokens: { type: 'begin' | 'end'; name: string; index: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = beginRegex.exec(code)) !== null) {
    combinedTokens.push({ type: 'begin', name: match[1], index: match.index });
  }
  while ((match = endRegex.exec(code)) !== null) {
    combinedTokens.push({ type: 'end', name: match[1], index: match.index });
  }

  // Sort by appearance in source
  combinedTokens.sort((a, b) => a.index - b.index);

  for (const token of combinedTokens) {
    if (token.type === 'begin') {
      envStack.push(token.name);
    } else {
      const top = envStack.pop();
      if (!top) {
        errors.push(`Found "\\end{${token.name}}" without a preceding "\\begin{${token.name}}".`);
      } else if (top !== token.name) {
        errors.push(
          `Mismatched environments: "\\begin{${top}}" was closed by "\\end{${token.name}}".`
        );
      }
    }
  }

  if (envStack.length > 0) {
    errors.push(
      `Unclosed environment(s): ${envStack.map((e) => `"\\begin{${e}}"`).join(', ')}.`
    );
  }

  // 3. Check math delimiters ($ unescaped)
  let singleDollarCount = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '$' && (i === 0 || code[i - 1] !== '\\')) {
      singleDollarCount++;
    }
  }
  if (singleDollarCount % 2 !== 0) {
    warnings.push('Odd number of "$" math delimiters detected — possible unclosed inline math.');
  }

  // 4. Run AST parse verification
  try {
    const ast = parse(code);
    if (!ast || !ast.content) {
      warnings.push('AST parser returned empty document.');
    }
  } catch (err: unknown) {
    errors.push(`LaTeX AST parse error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
