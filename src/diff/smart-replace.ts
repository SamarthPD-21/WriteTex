import DiffMatchPatch from 'diff-match-patch';
import { findSnippetLocation, findSnippetLocationFuzzy } from './apply';
import { SelectionRange } from '../messaging/types';

export type ReplacementReason =
  | 'exact_coords'
  | 'stale_coords_recovered'
  | 'active_selection'
  | 'original_snippet'
  | 'section_match'
  | 'section_similarity_match'
  | 'section_body_match'
  | 'section_insert_slot'
  | 'content_anchor'
  | 'preamble'
  | 'full_document'
  | 'bullet_match';

export interface SnippetReplacementLocation {
  from: number;
  to: number;
  matchedText: string;
  reason: ReplacementReason;
  confidence: number;
}

export interface LocateOptions {
  originalSnippet?: string;
  approximateIndex?: number;
  activeSelection?: SelectionRange | null;
  originalDocSnapshot?: string;
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

export interface DetectedSection {
  title: string;
  category: SectionCategory;
  startIndex: number;
  endIndex: number;
  headerLength: number;
  content: string;
}

/**
 * Scans a LaTeX document and extracts all sections, including standard LaTeX headers
 * and truncated/corrupted variations (e.g. `\section{...}`, `section{...}`, `elected Projects}`).
 */
export function scanSectionsInDoc(doc: string): DetectedSection[] {
  if (!doc) return [];

  const broadSecRegex = /(?:\\section\*?\s*\{([^}]+)\}|(?:^|[\r\n])[ \t]*(?:section|n)\s*\{([^}]+)\}|(?:^|[\r\n])[ \t]*([A-Za-z ]*(?:Projects|Experience|Skills|Education|Achievements)[^}\r\n]*)\})/gi;

  const rawMatches: Array<{ title: string; index: number; length: number }> = [];
  let m: RegExpExecArray | null;

  while ((m = broadSecRegex.exec(doc)) !== null) {
    const rawTitle = (m[1] || m[2] || m[3] || '').trim();
    if (!rawTitle) continue;

    // Filter out common false positives like \documentclass, \begin, etc.
    if (/^(?:document|article|tabular|center|itemize|enumerate)$/i.test(rawTitle)) {
      continue;
    }

    rawMatches.push({
      title: rawTitle,
      index: m.index,
      length: m[0].length,
    });
  }

  const endDocIdx = doc.indexOf('\\end{document}');
  const sections: DetectedSection[] = [];

  for (let i = 0; i < rawMatches.length; i++) {
    const curr = rawMatches[i];
    const next = rawMatches[i + 1];

    const startIndex = curr.index;
    let endIndex = doc.length;

    if (next) {
      endIndex = next.index;
    } else if (endDocIdx !== -1 && endDocIdx > startIndex) {
      endIndex = endDocIdx;
    }

    const category = getSectionCategory(curr.title);
    const content = doc.slice(startIndex, endIndex);

    sections.push({
      title: curr.title,
      category,
      startIndex,
      endIndex,
      headerLength: curr.length,
      content,
    });
  }

  return sections;
}

/**
 * Computes token-level Jaccard similarity between two LaTeX snippets.
 */
export function computeTokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const extractTokens = (text: string): Set<string> => {
    const words = text
      .toLowerCase()
      .replace(/[\\{}[\]$,.:;()'"-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    return new Set(words);
  };

  const setA = extractTokens(a);
  const setB = extractTokens(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Recovers stale selection coordinates when document was modified between
 * generation trigger and apply time.
 */
export function recoverStaleCoordinates(
  currentDoc: string,
  originalDocSnapshot: string | undefined,
  oldFrom: number,
  oldTo: number,
  expectedText: string
): { from: number; to: number; matchedText: string } | null {
  if (!currentDoc || !expectedText) return null;

  // 1. Direct offset check: Did the document not change at this offset?
  if (oldFrom >= 0 && oldTo <= currentDoc.length && oldFrom < oldTo) {
    const directSlice = currentDoc.slice(oldFrom, oldTo);
    if (directSlice === expectedText) {
      return { from: oldFrom, to: oldTo, matchedText: directSlice };
    }
  }

  // 2. Proximity search: findSnippetLocation near oldFrom
  const loc = findSnippetLocation(currentDoc, expectedText, oldFrom);
  if (loc) {
    return loc;
  }

  // 3. Diff-Match-Patch coordinate mapping using originalDocSnapshot
  if (originalDocSnapshot && originalDocSnapshot !== currentDoc) {
    try {
      const dmp = new DiffMatchPatch();
      const diffs = dmp.diff_main(originalDocSnapshot, currentDoc);
      dmp.diff_cleanupSemantic(diffs);

      let oldIdx = 0;
      let newIdx = 0;
      let mappedFrom = -1;
      let mappedTo = -1;

      for (const [op, text] of diffs) {
        const len = text.length;
        if (op === 0) {
          // EQUAL
          if (mappedFrom === -1 && oldIdx + len > oldFrom) {
            mappedFrom = newIdx + (oldFrom - oldIdx);
          }
          if (mappedTo === -1 && oldIdx + len >= oldTo) {
            mappedTo = newIdx + (oldTo - oldIdx);
          }
          oldIdx += len;
          newIdx += len;
        } else if (op === -1) {
          // DELETE in newDoc
          if (mappedFrom === -1 && oldIdx + len > oldFrom) {
            mappedFrom = newIdx;
          }
          if (mappedTo === -1 && oldIdx + len >= oldTo) {
            mappedTo = newIdx;
          }
          oldIdx += len;
        } else if (op === 1) {
          // INSERT in newDoc
          newIdx += len;
        }

        if (mappedFrom !== -1 && mappedTo !== -1) break;
      }

      if (mappedFrom !== -1 && mappedTo !== -1 && mappedFrom <= mappedTo && mappedTo <= currentDoc.length) {
        const candidateSlice = currentDoc.slice(mappedFrom, mappedTo);
        const sim = computeTokenSimilarity(candidateSlice, expectedText);
        if (sim >= 0.4 || candidateSlice === expectedText) {
          return {
            from: mappedFrom,
            to: mappedTo,
            matchedText: candidateSlice,
          };
        }
      }
    } catch {
      // Ignore DMP mapping errors and fall through
    }
  }

  // 4. Fuzzy search across full document as last resort
  const fuzzy = findSnippetLocationFuzzy(currentDoc, expectedText, oldFrom);
  if (fuzzy) {
    return fuzzy;
  }

  return null;
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
  const originalDocSnapshot = options?.originalDocSnapshot;

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

  // 2. Known Original Snippet Match (with stale coordinate recovery)
  if (originalSnippet && originalSnippet.length > 0) {
    const recovered = recoverStaleCoordinates(
      doc,
      originalDocSnapshot,
      approxIdx ?? 0,
      (approxIdx ?? 0) + originalSnippet.length,
      originalSnippet
    );
    if (recovered) {
      return {
        from: recovered.from,
        to: recovered.to,
        matchedText: recovered.matchedText,
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

    // C. Content-similarity fallback across sections
    if (matchedDocSectionIdx === -1 && docSections.length > 0) {
      let highestSim = 0;
      let bestIdx = -1;
      for (let i = 0; i < docSections.length; i++) {
        const sim = computeTokenSimilarity(docSections[i].content, cleanRep);
        if (sim > highestSim && sim >= 0.25) {
          highestSim = sim;
          bestIdx = i;
        }
      }
      if (bestIdx !== -1) {
        matchedDocSectionIdx = bestIdx;
      }
    }

    if (matchedDocSectionIdx !== -1) {
      const currentSec = docSections[matchedDocSectionIdx];
      return {
        from: currentSec.startIndex,
        to: currentSec.endIndex,
        matchedText: currentSec.content,
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
      return {
        from: currentSec.startIndex,
        to: currentSec.endIndex,
        matchedText: currentSec.content,
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
      return {
        from: currentSec.startIndex,
        to: currentSec.endIndex,
        matchedText: currentSec.content,
        reason: 'section_body_match',
        confidence: 0.93,
      };
    }
  }

  // 6. Multi-Anchor Content Match (Subheadings, jobs, or unique project identifiers)
  const anchorPhrases: string[] = [];
  const headingAnchorMatches = cleanRep.matchAll(
    /(?:\\resumeSubheading|\\resumeProjectHeading)[^{]*\{([^}]+)\}/gi
  );
  for (const hm of headingAnchorMatches) {
    const raw = (hm[1] || '')
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/[\\${}]/g, '')
      .trim();
    if (raw.length >= 6) {
      anchorPhrases.push(raw);
    }
  }

  // Also collect distinctive long brace parameters
  const braceMatches = cleanRep.matchAll(/\{([^{}\n\r]{12,})\}/g);
  for (const bm of braceMatches) {
    const raw = (bm[1] || '')
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/[\\${}]/g, '')
      .trim();
    if (raw.length >= 10 && !/^(?:itemize|enumerate|tabular|document|center)$/i.test(raw)) {
      if (!anchorPhrases.includes(raw)) {
        anchorPhrases.push(raw);
      }
    }
  }

  if (anchorPhrases.length > 0) {
    for (const anchor of anchorPhrases) {
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
          confidence: 0.94,
        };
      }
    }
  }

  // 7. Content Similarity Match across existing sections (for whole section replacement)
  if (docSections.length > 0) {
    let bestSim = 0;
    let bestSecIdx = -1;
    for (let i = 0; i < docSections.length; i++) {
      const sim = computeTokenSimilarity(docSections[i].content, cleanRep);
      if (sim > bestSim && sim >= 0.35) {
        bestSim = sim;
        bestSecIdx = i;
      }
    }
    if (bestSecIdx !== -1) {
      const currentSec = docSections[bestSecIdx];
      return {
        from: currentSec.startIndex,
        to: currentSec.endIndex,
        matchedText: currentSec.content,
        reason: 'section_similarity_match',
        confidence: 0.91,
      };
    }
  }

  // 7. Substantive Bullet Phrase Matching
  const itemMatches = cleanRep.matchAll(/\\resumeItem\{([^{}]{20,})\}/g);
  for (const rawItem of itemMatches) {
    const fullBullet = rawItem[1].trim();
    const candidates = [
      fullBullet,
      fullBullet.slice(0, 50),
      fullBullet.slice(0, 35),
    ];

    for (const candidate of candidates) {
      if (!candidate || candidate.length < 15) continue;
      const phraseIdx = doc.indexOf(candidate);
      if (phraseIdx !== -1) {
        const lineStart = doc.lastIndexOf('\n', phraseIdx) + 1;
        const lineEnd = doc.indexOf('\n', phraseIdx + candidate.length);
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
