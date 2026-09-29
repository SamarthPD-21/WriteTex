export interface LatexValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VERBATIM_ENVS = new Set(['verbatim', 'verbatim*', 'lstlisting', 'minted', 'comment']);

/**
 * Validates LaTeX snippets for structural integrity:
 * - Balanced curly braces (ignoring escaped \{ \}, comments and verbatim content)
 * - Balanced environment pairs \begin{env} ... \end{env}
 * - Balanced math delimiters $...$
 */
export function validateLatex(code: string): LatexValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const openBraces: number[] = []; // line numbers of unclosed "{"
  const envStack: { name: string; line: number }[] = [];
  let dollarCount = 0;
  let line = 1;
  let reportedStrayBrace = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];

    if (ch === '\n') {
      line++;
      continue;
    }

    // Comment: skip to end of line
    if (ch === '%') {
      while (i + 1 < code.length && code[i + 1] !== '\n') i++;
      continue;
    }

    if (ch === '\\') {
      const rest = code.slice(i + 1);
      const name = rest.match(/^[a-zA-Z@]+/)?.[0];
      if (!name) {
        // Control symbol such as \{ \} \$ \% \\ — skip the escaped character
        if (code[i + 1] === '\n') line++;
        i++;
        continue;
      }

      if (name === 'verb') {
        // \verb|...| uses an arbitrary delimiter
        const delim = code[i + 5];
        const close = delim ? code.indexOf(delim, i + 6) : -1;
        i = close === -1 ? i + 4 : close;
        continue;
      }

      const envMatch = (name === 'begin' || name === 'end') && rest.slice(name.length).match(/^\s*\{([^}]*)\}/);
      if (envMatch) {
        const envName = envMatch[1].trim();
        const tokenLength = 1 + name.length + envMatch[0].length;
        if (name === 'begin') {
          envStack.push({ name: envName, line });
          if (VERBATIM_ENVS.has(envName)) {
            // Skip verbatim content wholesale
            const endTag = `\\end{${envName}}`;
            const endIdx = code.indexOf(endTag, i + tokenLength);
            const skipTo = endIdx === -1 ? code.length : endIdx;
            line += (code.slice(i, skipTo).match(/\n/g) || []).length;
            i = skipTo - 1;
            continue;
          }
        } else {
          const top = envStack.pop();
          if (!top) {
            errors.push(`Line ${line}: Found "\\end{${envName}}" without a preceding "\\begin{${envName}}".`);
          } else if (top.name !== envName) {
            errors.push(
              `Line ${line}: Mismatched environments: "\\begin{${top.name}}" (line ${top.line}) was closed by "\\end{${envName}}".`
            );
          }
        }
        i += tokenLength - 1;
        continue;
      }

      i += name.length;
      continue;
    }

    if (ch === '{') {
      openBraces.push(line);
    } else if (ch === '}') {
      if (openBraces.length === 0) {
        if (!reportedStrayBrace) {
          errors.push(`Line ${line}: Unmatched closing curly brace "}" detected.`);
          reportedStrayBrace = true;
        }
      } else {
        openBraces.pop();
      }
    } else if (ch === '$') {
      dollarCount++;
    }
  }

  if (openBraces.length > 0) {
    errors.push(
      `Unclosed curly brace: ${openBraces.length} opening brace(s) without matching closing "}" (first opened on line ${openBraces[0]}).`
    );
  }

  if (envStack.length > 0) {
    errors.push(
      `Unclosed environment(s): ${envStack.map((e) => `"\\begin{${e.name}}" (line ${e.line})`).join(', ')}.`
    );
  }

  if (dollarCount % 2 !== 0) {
    warnings.push('Odd number of "$" math delimiters detected — possible unclosed inline math.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
