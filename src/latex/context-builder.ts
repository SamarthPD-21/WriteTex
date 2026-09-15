import { parseLatex, ParsedLatexDocument } from './parser';

export interface EnrichedPromptContext {
  fileName?: string;
  documentClass?: string;
  enclosingSection?: string;
  surroundingEnvironment?: string;
  relevantPackages: string[];
  definedCitations: string[];
  definedLabels: string[];
}

/**
 * Inspects the editor's document state and cursor/selection position
 * to extract semantic LaTeX context for LLM prompt enhancement.
 */
export function buildLatexContext(
  fullDoc?: string,
  selectedSnippet?: string,
  fileName?: string
): EnrichedPromptContext {
  const result: EnrichedPromptContext = {
    fileName,
    relevantPackages: [],
    definedCitations: [],
    definedLabels: [],
  };

  if (!fullDoc) {
    // If only snippet is available, parse snippet
    if (selectedSnippet) {
      try {
        const snippetParsed = parseLatex(selectedSnippet);
        if (snippetParsed.environments.length > 0) {
          result.surroundingEnvironment = snippetParsed.environments[0].name;
        }
      } catch {
        // Ignore fallback
      }
    }
    return result;
  }

  try {
    const parsed: ParsedLatexDocument = parseLatex(fullDoc);

    result.documentClass = parsed.documentClass;
    result.relevantPackages = parsed.packages.slice(0, 15);
    result.definedLabels = Array.from(new Set(parsed.labels.map((l) => l.name))).slice(0, 20);
    result.definedCitations = Array.from(
      new Set(parsed.citations.flatMap((c) => c.keys))
    ).slice(0, 30);

    // If we have a selected snippet, find which section and environment it belongs to
    if (selectedSnippet) {
      const snippetIndex = fullDoc.indexOf(selectedSnippet);
      if (snippetIndex !== -1) {
        // Find nearest section before this index
        const textBeforeSnippet = fullDoc.slice(0, snippetIndex);
        const sectionMatches = Array.from(
          textBeforeSnippet.matchAll(/\\(section|subsection|subsubsection|chapter)\*?\{([^}]+)\}/g)
        );
        if (sectionMatches.length > 0) {
          const lastSection = sectionMatches[sectionMatches.length - 1];
          result.enclosingSection = `${lastSection[1]}: ${lastSection[2]}`;
        }

        // Check if inside an environment (e.g. equation, figure, table, align)
        const openEnvMatches = Array.from(
          textBeforeSnippet.matchAll(/\\begin\{([a-zA-Z0-9*]+)\}/g)
        );
        const closeEnvMatches = Array.from(
          textBeforeSnippet.matchAll(/\\end\{([a-zA-Z0-9*]+)\}/g)
        );

        if (openEnvMatches.length > closeEnvMatches.length) {
          const lastOpen = openEnvMatches[openEnvMatches.length - 1];
          result.surroundingEnvironment = lastOpen[1];
        }
      }
    }
  } catch {
    // Gracefully handle incomplete LaTeX documents
  }

  return result;
}
