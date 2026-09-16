/**
 * LaTeX Export Utilities for WriteTex
 * Converts LaTeX snippets into clean Markdown or Plain Text and handles downloads.
 */

/**
 * Converts a LaTeX document or snippet into human-readable Plain Text.
 */
export function latexToPlainText(latex: string): string {
  if (!latex) return '';

  return latex
    // Remove unescaped comments: % ...
    .replace(/(?<!\\)%[^\n]*/g, '')
    // Replace text styling first so inner braces are resolved
    .replace(/\\(?:textbf|textit|emph|underline|textsc)\{([^}]*)\}/gi, '$1')
    .replace(/\\href\{([^}]*)\}\{([^}]*)\}/gi, '$2 ($1)')
    .replace(/\\url\{([^}]*)\}/gi, '$1')
    // Section headers
    .replace(/\\section\*?\{([^}]*)\}/gi, (_, s) => `\n\n=== ${s.trim().toUpperCase()} ===\n`)
    .replace(/\\subsection\*?\{([^}]*)\}/gi, (_, s) => `\n--- ${s.trim()} ---\n`)
    // Resume subheadings
    .replace(/\\resumeSubheading\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/gi, '\n$1 | $2\n$3 | $4\n')
    .replace(/\\resumeProjectHeading\s*\{([^}]*)\}\s*\{([^}]*)\}/gi, '\n$1 ($2)\n')
    // Bullet points
    .replace(/\\resumeItem\{([^}]*)\}/gi, '• $1\n')
    .replace(/\\item\s+/gi, '• ')
    // Escaped characters: \%, \$, \&, \_ -> %, $, &, _
    .replace(/\\([%$&_#{}])/g, '$1')
    // Remove environment tags: \begin{...}, \end{...}
    .replace(/\\(?:begin|end)\{[^}]*\}/gi, '')
    // Remove remaining backslash commands: \documentclass[...]{...}
    .replace(/\\[a-zA-Z@]+(?:\*|(?:\[[^\]]*\]))*\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z@]+/g, '')
    // Remove dangling brackets
    .replace(/[{}]/g, '')
    // Clean multiple line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts a LaTeX document or snippet into GitHub-flavored Markdown.
 */
export function latexToMarkdown(latex: string): string {
  if (!latex) return '';

  return latex
    // Remove unescaped comments: % ...
    .replace(/(?<!\\)%[^\n]*/g, '')
    // Text formatting first so inner braces are resolved
    .replace(/\\textbf\{([^}]*)\}/gi, '**$1**')
    .replace(/\\(?:textit|emph)\{([^}]*)\}/gi, '*$1*')
    .replace(/\\underline\{([^}]*)\}/gi, '_$1_')
    .replace(/\\href\{([^}]*)\}\{([^}]*)\}/gi, '[$2]($1)')
    .replace(/\\url\{([^}]*)\}/gi, '[$1]($1)')
    // Sections to headings
    .replace(/\\section\*?\{([^}]*)\}/gi, '\n\n## $1\n')
    .replace(/\\subsection\*?\{([^}]*)\}/gi, '\n\n### $1\n')
    // Subheadings
    .replace(/\\resumeSubheading\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/gi, '\n**$1** — *$2*  \n*$3* | $4\n')
    .replace(/\\resumeProjectHeading\s*\{([^}]*)\}\s*\{([^}]*)\}/gi, '\n**$1** ($2)\n')
    // Bullet points
    .replace(/\\resumeItem\{([^}]*)\}/gi, '- $1\n')
    .replace(/\\item\s+/gi, '- ')
    // Escaped characters
    .replace(/\\([%$&_#{}])/g, '$1')
    // Clean environments
    .replace(/\\(?:begin|end)\{[^}]*\}/gi, '')
    .replace(/\\[a-zA-Z@]+(?:\*|(?:\[[^\]]*\]))*\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z@]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Triggers a file download in the browser.
 */
export function downloadSnippetAsFile(filename: string, content: string, mimeType: string = 'text/plain') {
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[WriteTex] Failed to download snippet file:', err);
  }
}
