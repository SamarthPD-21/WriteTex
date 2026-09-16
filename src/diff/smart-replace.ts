import { findSnippetLocation } from './apply';
import { SelectionRange } from '../messaging/types';

export interface SnippetReplacementLocation {
  from: number;
  to: number;
  matchedText: string;
  reason:
    | 'exact_coords'
    | 'active_selection'
    | 'original_snippet'
    | 'section_match'
    | 'content_anchor'
    | 'preamble'
    | 'full_document'
    | 'bullet_match';
  confidence: number;
}

export interface LocateOptions {
  originalSnippet?: string;
  approximateIndex?: number;
  activeSelection?: SelectionRange | null;
}

/**
 * Intelligently locates the exact wrong or outdated code snippet in the document
 * that corresponds to the given replacement.
 *
 * NEVER appends or inserts blindly into unrelated locations.
 */
export function locateWrongSnippetInDoc(
  doc: string,
  replacement: string,
  options?: LocateOptions
): SnippetReplacementLocation | null {
  if (!doc) return null;

  const activeSel = options?.activeSelection;
  const originalSnippet = options?.originalSnippet?.trim();
  const approxIdx = options?.approximateIndex;

  // 1. Explicit Active Selection (User explicitly highlighted the wrong code in Overleaf)
  if (activeSel && !activeSel.empty && activeSel.from < activeSel.to) {
    const selectedSlice = doc.slice(activeSel.from, activeSel.to);
    return {
      from: activeSel.from,
      to: activeSel.to,
      matchedText: selectedSlice,
      reason: 'active_selection',
      confidence: 1.0,
    };
  }

  // 2. Known Original Snippet Match (e.g. from DiffResult or generation snapshot)
  if (originalSnippet && originalSnippet.length > 0) {
    const loc = findSnippetLocation(doc, originalSnippet, approxIdx);
    if (loc) {
      return {
        from: loc.from,
        to: loc.to,
        matchedText: loc.matchedText,
        reason: 'original_snippet',
        confidence: 0.95,
      };
    }
  }

  const cleanRep = replacement.trim();

  // 3. Full Document or Preamble Replacement
  if (cleanRep.startsWith('\\documentclass') || cleanRep.includes('\\begin{document}')) {
    // If the replacement contains \end{document}, it is a complete document replacement
    if (cleanRep.includes('\\end{document}')) {
      return {
        from: 0,
        to: doc.length,
        matchedText: doc,
        reason: 'full_document',
        confidence: 0.98,
      };
    }

    const beginDocIdx = doc.indexOf('\\begin{document}');
    if (beginDocIdx !== -1) {
      const endOfBeginDoc = beginDocIdx + '\\begin{document}'.length;
      return {
        from: 0,
        to: endOfBeginDoc,
        matchedText: doc.slice(0, endOfBeginDoc),
        reason: 'preamble',
        confidence: 0.95,
      };
    } else {
      // Document is completely missing \begin{document}; replace broken top or prepend
      return {
        from: 0,
        to: 0,
        matchedText: '',
        reason: 'preamble',
        confidence: 0.85,
      };
    }
  }

  // 4. Section Match (Replacement is a full \section{...})
  const sectionMatch = cleanRep.match(/\\section\*?\{([^}]+)\}/i);
  if (sectionMatch) {
    const sectionTitle = sectionMatch[1].trim();
    // Look for matching section in doc (including broken forms like section{Title} or n{Title})
    const secRegex = new RegExp(
      `(?:\\\\section\\*?\\s*\\{[\\s]*${escapeRegex(sectionTitle)}[\\s]*\\}|(?:^|[\\r\\n])[ \\t]*(?:section|n)\\s*\\{[\\s]*${escapeRegex(sectionTitle)}[\\s]*\\})`,
      'i'
    );
    const match = secRegex.exec(doc);
    if (match) {
      const secStart = match.index;
      // Search forward for the start of the next section, \end{document}, or document end
      const nextSecRegex = /(?:\\section\*?\{|(?:^|[\r\n])[ \t]*(?:section|n)\{|\\end\{document\})/gi;
      nextSecRegex.lastIndex = secStart + match[0].length;
      const nextMatch = nextSecRegex.exec(doc);
      const secEnd = nextMatch ? nextMatch.index : doc.length;

      return {
        from: secStart,
        to: secEnd,
        matchedText: doc.slice(secStart, secEnd),
        reason: 'section_match',
        confidence: 0.92,
      };
    }
  }

  // 5. Content Anchor Match (Subheadings, jobs, or unique project identifiers)
  // Extracts phrases in braces like {Software Engineer II --- Core Infrastructure} or {FinTech Infrastructure Systems}
  const braceMatches = cleanRep.match(/\{([^{}\n\r]{14,})\}/g);
  if (braceMatches && braceMatches.length > 0) {
    for (const rawBrace of braceMatches) {
      const anchor = rawBrace.slice(1, -1).trim();
      const anchorIdx = doc.indexOf(anchor);
      if (anchorIdx !== -1) {
        // Expand backwards to the beginning of this subheading / item block
        const prevText = doc.slice(0, anchorIdx);
        const headingMatch = prevText.match(
          /(?:\\resumeSubheading|sumeSubheading|resumeSubheading|\\resumeProjectHeading|resumeProjectHeading)[^\r\n]*$/i
        );

        const blockStart = headingMatch && headingMatch.index !== undefined
          ? headingMatch.index
          : Math.max(0, prevText.lastIndexOf('\n\n') + 2);

        // Expand forward to the end of this block (\resumeItemListEnd or next subheading)
        const nextText = doc.slice(anchorIdx);
        const endMatch = nextText.match(
          /(?:\\resumeItemListEnd|resumeItemListEnd|\n\s*(?:\\resumeSubheading|sumeSubheading|resumeSubheading|\n\s*\\section))/i
        );

        let blockEnd = doc.length;
        if (endMatch && endMatch.index !== undefined) {
          if (endMatch[0].toLowerCase().includes('itemlistend')) {
            blockEnd = anchorIdx + endMatch.index + endMatch[0].length;
          } else {
            blockEnd = anchorIdx + endMatch.index;
          }
        }

        return {
          from: blockStart,
          to: blockEnd,
          matchedText: doc.slice(blockStart, blockEnd),
          reason: 'content_anchor',
          confidence: 0.89,
        };
      }
    }
  }

  // 6. Substantive Bullet Phrase Matching
  // Extracts text inside \resumeItem{...} or \item
  const itemMatches = cleanRep.match(/\\resumeItem\{([^{}]{20,})\}/g);
  if (itemMatches && itemMatches.length > 0) {
    for (const rawItem of itemMatches) {
      const phrase = rawItem.replace(/^\\resumeItem\{/, '').replace(/\}$/, '').trim().slice(0, 35);
      const phraseIdx = doc.indexOf(phrase);
      if (phraseIdx !== -1) {
        // Locate starting line and ending line for this item
        const lineStart = doc.lastIndexOf('\n', phraseIdx) + 1;
        const lineEnd = doc.indexOf('\n', phraseIdx + phrase.length);
        const to = lineEnd === -1 ? doc.length : lineEnd;

        return {
          from: lineStart,
          to,
          matchedText: doc.slice(lineStart, to),
          reason: 'bullet_match',
          confidence: 0.85,
        };
      }
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
