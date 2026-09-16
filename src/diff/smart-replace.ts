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
    | 'section_body_match'
    | 'section_insert_slot'
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
 * Standard semantic categories for resume and document sections.
 */
export type SectionCategory =
  | 'projects'
  | 'experience'
  | 'skills'
  | 'education'
  | 'achievements'
  | 'other';

/**
 * Classifies a section title into a semantic resume category.
 */
export function getSectionCategory(title: string): SectionCategory {
  const clean = title.toLowerCase().trim();

  // Projects check (must be checked before experience)
  if (clean.includes('project')) {
    return 'projects';
  }
  // Experience check
  if (
    clean.includes('experien') ||
    clean.includes('employ') ||
    clean.includes('work hist') ||
    clean.includes('career')
  ) {
    return 'experience';
  }
  // Technical Skills check
  if (
    clean.includes('skill') ||
    clean.includes('technolog') ||
    clean.includes('competenc') ||
    clean.includes('tools') ||
    clean.includes('expertise')
  ) {
    return 'skills';
  }
  // Education check
  if (
    clean.includes('educat') ||
    clean.includes('academic') ||
    clean.includes('degree') ||
    clean.includes('credential')
  ) {
    return 'education';
  }
  // Achievements check
  if (
    clean.includes('achieve') ||
    clean.includes('award') ||
    clean.includes('honor') ||
    clean.includes('certif') ||
    clean.includes('publication')
  ) {
    return 'achievements';
  }

  return 'other';
}

interface DetectedSection {
  title: string;
  category: SectionCategory;
  startIndex: number;
  headerLength: number;
}

/**
 * Scans a LaTeX document and extracts all sections, including standard LaTeX headers
 * and truncated/corrupted variations (e.g. `\section{...}`, `section{...}`, `elected Projects}`).
 */
export function scanSectionsInDoc(doc: string): DetectedSection[] {
  // Regex matches:
  // 1. \section*{...} or \section{...}
  // 2. Corrupted section{...} or n{...}
  // 3. Leading-character-stripped headers like `elected Projects}` or `Selected Projects}`
  const broadSecRegex = /(?:\\section\*?\s*\{([^}]+)\}|(?:^|[\r\n])[ \t]*(?:section|n)\s*\{([^}]+)\}|(?:^|[\r\n])[ \t]*([A-Za-z ]*(?:Projects|Experience|Skills|Education|Achievements)[^}\r\n]*)\})/gi;

  const sections: DetectedSection[] = [];
  let m: RegExpExecArray | null;

  while ((m = broadSecRegex.exec(doc)) !== null) {
    const rawTitle = (m[1] || m[2] || m[3] || '').trim();
    if (!rawTitle) continue;

    // Filter out common false positives like \documentclass, \begin, etc.
    if (/^(?:document|article|tabular|center|itemize|enumerate)$/i.test(rawTitle)) {
      continue;
    }

    const category = getSectionCategory(rawTitle);
    sections.push({
      title: rawTitle,
      category,
      startIndex: m.index,
      headerLength: m[0].length,
    });
  }

  return sections;
}

/**
 * Intelligently locates the exact wrong or outdated code snippet in the document
 * that corresponds to the given replacement.
 *
 * GUARANTEES:
 * 1. Matches semantic section aliases (e.g. \section{Projects} replaces \section{Selected Projects}).
 * 2. Replaces entire old section ranges up to the next section or \end{document}.
 * 3. Handles implicit project/experience blocks that lack \section headers.
 * 4. NEVER appends duplicate sections.
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

  // 1. Explicit Active Selection (User highlighted the code in Overleaf)
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

  // 2. Known Original Snippet Match (from DiffResult or generation snapshot)
  if (originalSnippet && originalSnippet.length > 0) {
    const loc = findSnippetLocation(doc, originalSnippet, approxIdx);
    if (loc) {
      return {
        from: loc.from,
        to: loc.to,
        matchedText: loc.matchedText,
        reason: 'original_snippet',
        confidence: 0.98,
      };
    }
  }

  const cleanRep = replacement.trim();

  // 3. Full Document or Preamble Replacement
  if (cleanRep.startsWith('\\documentclass') || cleanRep.includes('\\begin{document}')) {
    if (cleanRep.includes('\\end{document}')) {
      return {
        from: 0,
        to: doc.length,
        matchedText: doc,
        reason: 'full_document',
        confidence: 0.99,
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
      return {
        from: 0,
        to: 0,
        matchedText: '',
        reason: 'preamble',
        confidence: 0.85,
      };
    }
  }

  // Scan all existing sections in doc once
  const docSections = scanSectionsInDoc(doc);

  // 4. Explicit Section Replacement (Replacement contains \section{...})
  const repSectionMatch = cleanRep.match(/\\section\*?\{([^}]+)\}/i);
  if (repSectionMatch) {
    const repTitle = repSectionMatch[1].trim();
    const repCategory = getSectionCategory(repTitle);

    // Look for exact title match first, then semantic category match
    let matchedDocSectionIdx = -1;

    // A. Exact title match (case-insensitive)
    matchedDocSectionIdx = docSections.findIndex(
      (s) => s.title.toLowerCase() === repTitle.toLowerCase()
    );

    // B. Semantic category match (e.g. \section{Projects} replaces \section{Selected Projects})
    if (matchedDocSectionIdx === -1 && repCategory !== 'other') {
      matchedDocSectionIdx = docSections.findIndex((s) => s.category === repCategory);
    }

    if (matchedDocSectionIdx !== -1) {
      const currentSec = docSections[matchedDocSectionIdx];
      const nextSec = docSections[matchedDocSectionIdx + 1];

      const secStart = currentSec.startIndex;
      let secEnd = doc.length;

      if (nextSec) {
        secEnd = nextSec.startIndex;
      } else {
        const endDocIdx = doc.indexOf('\\end{document}');
        if (endDocIdx !== -1 && endDocIdx > secStart) {
          secEnd = endDocIdx;
        }
      }

      return {
        from: secStart,
        to: secEnd,
        matchedText: doc.slice(secStart, secEnd),
        reason: 'section_match',
        confidence: 0.96,
      };
    }
  }

  // 5. Implicit Section / Block Replacement (Replacement lacks \section header but contains section items)
  // 5A. Projects Block without \section header (contains \resumeProjectHeading)
  const isProjectsBlock =
    cleanRep.includes('\\resumeProjectHeading') || cleanRep.includes('resumeProjectHeading');
  if (isProjectsBlock) {
    const projSecIdx = docSections.findIndex((s) => s.category === 'projects');
    if (projSecIdx !== -1) {
      const currentSec = docSections[projSecIdx];
      const nextSec = docSections[projSecIdx + 1];

      const secStart = currentSec.startIndex;
      let secEnd = doc.length;
      if (nextSec) {
        secEnd = nextSec.startIndex;
      } else {
        const endDocIdx = doc.indexOf('\\end{document}');
        if (endDocIdx !== -1 && endDocIdx > secStart) {
          secEnd = endDocIdx;
        }
      }

      // If replacement has \resumeSubHeadingListStart, we can replace the entire projects section
      // or replace the list inside it
      return {
        from: secStart,
        to: secEnd,
        matchedText: doc.slice(secStart, secEnd),
        reason: 'section_body_match',
        confidence: 0.93,
      };
    }
  }

  // 5B. Technical Skills Block without \section header (contains \textbf{Languages} or \textbf{Frameworks})
  const isSkillsBlock =
    cleanRep.includes('\\textbf{Languages}') || cleanRep.includes('\\textbf{Frameworks');
  if (isSkillsBlock) {
    const skillsSecIdx = docSections.findIndex((s) => s.category === 'skills');
    if (skillsSecIdx !== -1) {
      const currentSec = docSections[skillsSecIdx];
      const nextSec = docSections[skillsSecIdx + 1];

      const secStart = currentSec.startIndex;
      let secEnd = doc.length;
      if (nextSec) {
        secEnd = nextSec.startIndex;
      } else {
        const endDocIdx = doc.indexOf('\\end{document}');
        if (endDocIdx !== -1 && endDocIdx > secStart) {
          secEnd = endDocIdx;
        }
      }

      return {
        from: secStart,
        to: secEnd,
        matchedText: doc.slice(secStart, secEnd),
        reason: 'section_body_match',
        confidence: 0.93,
      };
    }
  }

  // 6. Content Anchor Match (Subheadings, jobs, or unique project identifiers)
  const braceMatches = cleanRep.match(/\{([^{}\n\r]{12,})\}/g);
  if (braceMatches && braceMatches.length > 0) {
    for (const rawBrace of braceMatches) {
      const anchor = rawBrace.slice(1, -1).trim();
      if (!anchor || /^(?:itemize|enumerate|tabular|document|center)$/i.test(anchor)) continue;

      const anchorIdx = doc.indexOf(anchor);
      if (anchorIdx !== -1) {
        const prevText = doc.slice(0, anchorIdx);
        const headingMatch = prevText.match(
          /(?:\\resumeSubheading|sumeSubheading|resumeSubheading|\\resumeProjectHeading|resumeProjectHeading)[^\r\n]*$/i
        );

        const blockStart =
          headingMatch && headingMatch.index !== undefined
            ? headingMatch.index
            : Math.max(0, prevText.lastIndexOf('\n\n') + 2);

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
          confidence: 0.90,
        };
      }
    }
  }

  // 7. Substantive Bullet Phrase Matching
  const itemMatches = cleanRep.match(/\\resumeItem\{([^{}]{20,})\}/g);
  if (itemMatches && itemMatches.length > 0) {
    for (const rawItem of itemMatches) {
      const phrase = rawItem
        .replace(/^\\resumeItem\{/, '')
        .replace(/\}$/, '')
        .trim()
        .slice(0, 35);
      const phraseIdx = doc.indexOf(phrase);
      if (phraseIdx !== -1) {
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

  // 8. Missing Section Insertion Slot (Never Blindly Append at End!)
  // If the document DOES NOT have the section yet, insert at the appropriate semantic location
  // BEFORE \end{document} or adjacent section.
  if (repSectionMatch) {
    const repCategory = getSectionCategory(repSectionMatch[1].trim());

    if (repCategory === 'projects') {
      // Standard order: Education -> Experience -> Projects -> Skills -> Achievements
      const skillsSec = docSections.find((s) => s.category === 'skills');
      const achieveSec = docSections.find((s) => s.category === 'achievements');
      const endDocIdx = doc.indexOf('\\end{document}');

      const insertIdx = skillsSec
        ? skillsSec.startIndex
        : achieveSec
        ? achieveSec.startIndex
        : endDocIdx !== -1
        ? endDocIdx
        : doc.length;

      return {
        from: insertIdx,
        to: insertIdx,
        matchedText: '',
        reason: 'section_insert_slot',
        confidence: 0.82,
      };
    } else if (repCategory === 'skills') {
      const achieveSec = docSections.find((s) => s.category === 'achievements');
      const endDocIdx = doc.indexOf('\\end{document}');

      const insertIdx = achieveSec
        ? achieveSec.startIndex
        : endDocIdx !== -1
        ? endDocIdx
        : doc.length;

      return {
        from: insertIdx,
        to: insertIdx,
        matchedText: '',
        reason: 'section_insert_slot',
        confidence: 0.82,
      };
    }
  }

  return null;
}
