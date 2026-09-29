import DiffMatchPatch from 'diff-match-patch';
import { findSnippetLocation, findSnippetLocationFuzzy, textSimilarity } from './apply';
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
  | 'bullet_match'
  | 'paragraph_match';

export interface SnippetReplacementLocation {
  from: number;
  to: number;
  matchedText: string;
  reason: ReplacementReason;
  confidence: number;
  /**
   * Text to write into [from, to). Set when the engine had to merge the model
   * output with untouched document content (e.g. only 2 of 3 bullets were
   * rewritten). When absent, write the replacement unchanged.
   */
  replacementText?: string;
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
  | 'summary'
  | 'projects'
  | 'experience'
  | 'skills'
  | 'education'
  | 'achievements'
  | 'other';

/**
 * Conventional top-to-bottom order, used to place a section the document lacks.
 */
const SECTION_RANK: Record<SectionCategory, number> = {
  summary: 0,
  education: 1,
  experience: 2,
  projects: 3,
  skills: 4,
  achievements: 5,
  other: 6,
};

/**
 * Classifies a section title into a semantic resume category.
 */
export function getSectionCategory(title: string): SectionCategory {
  const clean = title.toLowerCase().trim();

  // Projects check (must be checked before experience)
  if (clean.includes('project') || clean.includes('open source')) {
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
  // Summary check
  if (
    clean.includes('summary') ||
    clean.includes('objective') ||
    clean.includes('profile') ||
    clean.includes('about')
  ) {
    return 'summary';
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
 * Commented-out headers are ignored.
 */
export function scanSectionsInDoc(doc: string): DetectedSection[] {
  if (!doc) return [];

  // 3rd alternative: a header whose "\section{" prefix was lost ("elected Projects}"). It must be
  // a short capitalized title alone on its line at brace depth 0, so wrapped bullet text such as
  // "improving developer experience by 30\%}" is not mistaken for a header.
  const broadSecRegex = /(?:\\section\*?\s*\{([^}]+)\}|(?:^|[\r\n])[ \t]*(?:section|n)\s*\{([^}]+)\}|(?:^|[\r\n])[ \t]*([A-Za-z ]{0,30}(?:Projects|Experience|Skills|Education|Achievements)[A-Za-z ]{0,20})\}[ \t]*(?=\r?\n|$))/g;

  const rawMatches: Array<{ title: string; index: number; length: number }> = [];
  let m: RegExpExecArray | null;

  while ((m = broadSecRegex.exec(doc)) !== null) {
    const rawTitle = (m[1] || m[2] || m[3] || '').trim();
    if (!rawTitle) continue;

    // Filter out common false positives like \documentclass, \begin, etc.
    if (/^(?:document|article|tabular|center|itemize|enumerate)$/i.test(rawTitle)) {
      continue;
    }

    // Point at the header itself, not the newline the regex consumed before it
    const lead = m[0].length - m[0].replace(/^[\r\n \t]+/, '').length;
    const index = m.index + lead;
    if (isCommentedOut(doc, index)) continue;
    if (m[3] && braceDepthAt(doc, index) !== 0) continue;

    rawMatches.push({
      title: rawTitle,
      index,
      length: m[0].length - lead,
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

/** Number of unclosed `{` before `index`, ignoring escaped braces and comments. */
function braceDepthAt(text: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
    } else if (ch === '%') {
      while (i < index && text[i] !== '\n') i++;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
  return depth;
}

/** True when an unescaped % precedes `index` on the same line. */
function isCommentedOut(text: string, index: number): boolean {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  return /(?:^|[^\\])%/.test(text.slice(lineStart, index));
}

/** Moves `end` back over trailing whitespace, never past `start`. */
function trimEndIndex(text: string, start: number, end: number): number {
  while (end > start && /\s/.test(text[end - 1])) end--;
  return end;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[\\{}[\]$,.:;()'"-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

/**
 * Computes token-level Jaccard similarity between two LaTeX snippets.
 */
export function computeTokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Share of the smaller token set found in the larger one. Robust to a bullet
 * being rewritten with extra words, where Jaccard similarity drops sharply.
 */
function tokenOverlap(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  return intersection / Math.min(setA.size, setB.size);
}

/** Reduces LaTeX to lowercase words for comparing human-visible content. */
function plainText(latex: string): string {
  return latex
    .replace(/(^|[^\\])%[^\n]*/g, '$1')
    .replace(/\\[a-zA-Z@]+\*?/g, ' ')
    .replace(/[{}$\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Returns the index just past the brace group opening at `pos`, or -1 if unbalanced. */
function readBraceGroup(text: string, pos: number): number {
  if (text[pos] !== '{') return -1;
  let depth = 0;
  for (let i = pos; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Index of the first character of the document body (or 0 when there is no preamble). */
function bodyStart(text: string): number {
  const idx = text.indexOf('\\begin{document}');
  return idx === -1 ? 0 : idx + '\\begin{document}'.length;
}

function bodyEnd(text: string): number {
  const idx = text.indexOf('\\end{document}');
  return idx === -1 ? text.length : idx;
}

// ------------------------------------------------------------------
// Block extraction: entries, bullets, paragraphs
// ------------------------------------------------------------------

interface Block {
  from: number;
  to: number;
  text: string;
  /** Matching key; meaning depends on block type. */
  key: string;
  /** Secondary key used as a fallback (e.g. company without job title). */
  altKey?: string;
  kind?: string;
}

// Tolerates macros that lost their backslash or leading letters to a bad paste
const ENTRY_HEAD_REGEX = /(?<![A-Za-z])\\?(resumeSubheading|sumeSubheading|resumeProjectHeading|cventry)(?![A-Za-z])/g;
const ENTRY_BOUNDARY_REGEX = /(?<![A-Za-z])\\?(?:resume)?SubHeadingListEnd|\\section\*?\s*\{|\\end\{document\}/g;

/**
 * Finds resume entries (jobs, projects, cventries). An entry runs from its heading
 * macro to the next heading, the end of the enclosing list, or the next section.
 */
function extractEntries(text: string, start: number, end: number): Block[] {
  const heads: { index: number; length: number; kind: string }[] = [];
  const headRegex = new RegExp(ENTRY_HEAD_REGEX.source, 'g');
  headRegex.lastIndex = start;
  let m: RegExpExecArray | null;
  while ((m = headRegex.exec(text)) !== null && m.index < end) {
    if (isCommentedOut(text, m.index)) continue;
    const kind = m[1] === 'sumeSubheading' ? 'resumeSubheading' : m[1];
    heads.push({ index: m.index, length: m[0].length, kind });
  }

  const boundaries: number[] = [];
  const boundaryRegex = new RegExp(ENTRY_BOUNDARY_REGEX.source, 'g');
  boundaryRegex.lastIndex = start;
  while ((m = boundaryRegex.exec(text)) !== null && m.index < end) {
    boundaries.push(m.index);
  }
  for (const sec of scanSectionsInDoc(text)) {
    if (sec.startIndex >= start && sec.startIndex < end) boundaries.push(sec.startIndex);
  }

  const entries: Block[] = [];
  for (let i = 0; i < heads.length; i++) {
    const head = heads[i];
    const nextHead = i + 1 < heads.length ? heads[i + 1].index : end;
    const nextBoundary = boundaries.filter((b) => b > head.index).reduce((a, b) => Math.min(a, b), end);
    const to = trimEndIndex(text, head.index, Math.min(nextHead, nextBoundary));

    // Collect the heading's brace arguments
    const args: string[] = [];
    let pos = head.index + head.length;
    while (args.length < 6) {
      while (pos < to && /\s/.test(text[pos])) pos++;
      if (text[pos] === '[') {
        const close = text.indexOf(']', pos);
        if (close === -1) break;
        pos = close + 1;
        continue;
      }
      const close = readBraceGroup(text, pos);
      if (close === -1 || close > to) break;
      args.push(text.slice(pos + 1, close - 1));
      pos = close;
    }

    const first = plainText(args[0] || '');
    // Project headings put "Name | Tech Stack" in the first argument; only the name identifies it
    const primary = head.kind === 'resumeProjectHeading' ? first.split('|')[0].trim() : first;
    const title = head.kind === 'resumeProjectHeading' ? '' : plainText(args[2] || '');

    entries.push({
      from: head.index,
      to,
      text: text.slice(head.index, to),
      key: title ? `${primary} | ${title}` : primary,
      altKey: primary,
      kind: head.kind,
    });
  }
  return entries;
}

const BULLET_HEAD_REGEX = /(?<![A-Za-z])\\?(?:resumeItem|sumeItem)\{|\\item(?![A-Za-z])/g;
const BULLET_STOP_REGEX = /\\item(?![A-Za-z])|\\end\{(?:itemize|enumerate)\}|(?<![A-Za-z])\\?resumeItemListEnd|\\resumeSubheading|\\resumeProjectHeading|\\section/g;

/**
 * Finds bullet points: `\resumeItem{...}` (brace-balanced) and plain `\item ...`.
 */
function extractBullets(text: string, start: number, end: number): Block[] {
  const bullets: Block[] = [];
  const headRegex = new RegExp(BULLET_HEAD_REGEX.source, 'g');
  headRegex.lastIndex = start;
  let m: RegExpExecArray | null;
  while ((m = headRegex.exec(text)) !== null && m.index < end) {
    if (isCommentedOut(text, m.index)) continue;
    let to: number;
    if (m[0].endsWith('{')) {
      to = readBraceGroup(text, m.index + m[0].length - 1);
      if (to === -1) continue;
    } else {
      const stop = new RegExp(BULLET_STOP_REGEX.source, 'g');
      stop.lastIndex = m.index + m[0].length;
      const next = stop.exec(text);
      to = trimEndIndex(text, m.index, next && next.index < end ? next.index : end);
    }
    if (to > end) continue;
    const textSlice = text.slice(m.index, to);
    bullets.push({ from: m.index, to, text: textSlice, key: plainText(textSlice) });
    headRegex.lastIndex = to;
  }
  return bullets;
}

/**
 * Splits prose into blank-line separated paragraphs (cover letters, summaries).
 * Lines that are pure LaTeX commands are skipped.
 */
function extractParagraphs(text: string, start: number, end: number): Block[] {
  const paragraphs: Block[] = [];
  const regex = /\S[\s\S]*?(?=\n[ \t]*\n|$)/g;
  const slice = text.slice(start, end);
  let m: RegExpExecArray | null;
  while ((m = regex.exec(slice)) !== null) {
    const from = start + m.index;
    const to = trimEndIndex(text, from, from + m[0].length);
    const body = text.slice(from, to);
    const words = plainText(body);
    if (words.split(' ').length < 6) continue;
    paragraphs.push({ from, to, text: body, key: words });
  }
  return paragraphs;
}

// ------------------------------------------------------------------
// Merging model output into the document
// ------------------------------------------------------------------

interface MergeResult {
  from: number;
  to: number;
  text: string;
  matchedCount: number;
  averageScore: number;
}

/**
 * Pairs each replacement block with at most one document block (best scores first),
 * then rebuilds the document span covering all matches: matched blocks take the new
 * text, unmatched document blocks and separators are kept verbatim, and replacement
 * blocks with no counterpart are inserted after their predecessor.
 */
function mergeBlocks(
  doc: string,
  docBlocks: Block[],
  repBlocks: Block[],
  score: (d: Block, r: Block) => number,
  threshold: number
): MergeResult | null {
  if (docBlocks.length === 0 || repBlocks.length === 0) return null;

  const pairs: { d: number; r: number; s: number }[] = [];
  for (let d = 0; d < docBlocks.length; d++) {
    for (let r = 0; r < repBlocks.length; r++) {
      const s = score(docBlocks[d], repBlocks[r]);
      if (s >= threshold) pairs.push({ d, r, s });
    }
  }
  pairs.sort((a, b) => b.s - a.s);

  const docToRep = new Map<number, number>();
  const repToDoc = new Map<number, number>();
  let totalScore = 0;
  for (const p of pairs) {
    if (docToRep.has(p.d) || repToDoc.has(p.r)) continue;
    docToRep.set(p.d, p.r);
    repToDoc.set(p.r, p.d);
    totalScore += p.s;
  }
  if (docToRep.size === 0) return null;

  const matchedDoc = [...docToRep.keys()].sort((a, b) => a - b);
  const firstDoc = matchedDoc[0];
  const lastDoc = matchedDoc[matchedDoc.length - 1];
  const from = docBlocks[firstDoc].from;
  const to = docBlocks[lastDoc].to;

  // Replacement blocks without a match, grouped under the matched block that precedes them
  const followers = new Map<number, number[]>();
  const leading: number[] = [];
  let previousMatched = -1;
  for (let r = 0; r < repBlocks.length; r++) {
    if (repToDoc.has(r)) {
      previousMatched = r;
    } else if (previousMatched === -1) {
      leading.push(r);
    } else {
      followers.set(previousMatched, [...(followers.get(previousMatched) || []), r]);
    }
  }

  const separatorBefore = (pos: number) => {
    const lineStart = doc.lastIndexOf('\n', pos - 1) + 1;
    const indent = doc.slice(lineStart, pos);
    return '\n' + (/^\s*$/.test(indent) ? indent : '');
  };

  let out = '';
  let cursor = from;
  for (let d = firstDoc; d <= lastDoc; d++) {
    const block = docBlocks[d];
    if (block.from < cursor) continue;
    out += doc.slice(cursor, block.from);
    const sep = separatorBefore(block.from);
    const r = docToRep.get(d);
    if (r === undefined) {
      out += block.text;
    } else {
      if (d === firstDoc) {
        for (const l of leading) out += repBlocks[l].text + sep;
      }
      out += repBlocks[r].text;
      for (const f of followers.get(r) || []) out += sep + repBlocks[f].text;
    }
    cursor = block.to;
  }
  out += doc.slice(cursor, to);

  return {
    from,
    to,
    text: out,
    matchedCount: docToRep.size,
    averageScore: totalScore / docToRep.size,
  };
}

function scoreEntries(d: Block, r: Block): number {
  if (d.kind !== r.kind || !d.key || !r.key) return 0;
  if (d.key === r.key) return 1;
  if (d.altKey && d.altKey === r.altKey) return 0.9;
  const sim = textSimilarity(d.altKey || d.key, r.altKey || r.key);
  return sim >= 0.8 ? sim * 0.85 : 0;
}

function scoreProse(d: Block, r: Block): number {
  if (!d.key || !r.key) return 0;
  return 0.5 * tokenOverlap(d.key, r.key) + 0.5 * textSimilarity(d.key, r.key);
}

/**
 * Splits a replacement into its \section chunks. Text before the first header is
 * attached to the first chunk so nothing the model wrote is dropped.
 */
function splitReplacementSections(rep: string): Block[] {
  const headers = [...rep.matchAll(/\\section\*?\s*\{([^}]+)\}/g)];
  return headers.map((h, i) => {
    const from = i === 0 ? 0 : h.index!;
    const to = i + 1 < headers.length ? headers[i + 1].index! : rep.length;
    return {
      from,
      to,
      text: rep.slice(from, to).trim(),
      key: h[1].trim(),
      kind: getSectionCategory(h[1]),
    };
  });
}

function sectionBlocks(doc: string, sections: DetectedSection[]): Block[] {
  return sections.map((s) => {
    const to = trimEndIndex(doc, s.startIndex, s.endIndex);
    return {
      from: s.startIndex,
      to,
      text: doc.slice(s.startIndex, to),
      key: s.title,
      kind: s.category,
    };
  });
}

function scoreSections(d: Block, r: Block): number {
  if (d.key.toLowerCase() === r.key.toLowerCase()) return 1;
  if (d.kind !== 'other' && d.kind === r.kind) return 0.9;
  // A custom-titled section (e.g. "Core Engineering Endeavors") may be the one being rewritten
  if (d.kind === 'other' || d.kind === r.kind) {
    return computeTokenSimilarity(d.text, r.text) >= 0.25 ? 0.6 : 0;
  }
  return 0;
}

/**
 * Where a section missing from the document belongs: after the last section that
 * conventionally precedes it, else before the first section, else before \end{document}.
 */
function findSectionInsertSlot(doc: string, sections: DetectedSection[], category: SectionCategory): number {
  const rank = SECTION_RANK[category];
  const preceding = sections.filter((s) => SECTION_RANK[s.category] <= rank && s.category !== 'other');
  if (preceding.length > 0) {
    const last = preceding[preceding.length - 1];
    return trimEndIndex(doc, last.startIndex, last.endIndex);
  }
  if (category !== 'other' && sections.length > 0) return sections[0].startIndex;
  const endDoc = doc.indexOf('\\end{document}');
  return endDoc !== -1 ? endDoc : doc.length;
}

/**
 * Replaces the body of a section (keeping its header). When the section wraps its
 * entries in \resumeSubHeadingListStart/End and the replacement does not, only the
 * list contents are replaced so the wrapper survives.
 */
function locateSectionBody(
  doc: string,
  section: DetectedSection,
  rep: string
): SnippetReplacementLocation {
  const bodyFrom = section.startIndex + section.headerLength;
  const bodyTo = trimEndIndex(doc, bodyFrom, section.endIndex);
  const body = doc.slice(bodyFrom, bodyTo);

  const listStart = body.match(/\\resumeSubHeadingListStart/);
  const listEnd = body.lastIndexOf('\\resumeSubHeadingListEnd');
  if (listStart && listEnd !== -1 && !rep.includes('SubHeadingListStart')) {
    const from = bodyFrom + listStart.index! + listStart[0].length;
    const to = bodyFrom + listEnd;
    return {
      from,
      to,
      matchedText: doc.slice(from, to),
      reason: 'section_body_match',
      confidence: 0.9,
      replacementText: '\n  ' + rep.trim() + '\n',
    };
  }

  let from = bodyFrom;
  while (from < bodyTo && /\s/.test(doc[from])) from++;
  return {
    from,
    to: bodyTo,
    matchedText: doc.slice(from, bodyTo),
    reason: 'section_body_match',
    confidence: 0.9,
    replacementText: rep.trim(),
  };
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
 * 2. Replaces only the entries/bullets/paragraphs the model actually rewrote; anything in
 *    between that the model did not return is preserved verbatim.
 * 3. Never touches the preamble or unrelated entries when a single entry is returned.
 * 4. NEVER appends duplicate sections; new sections are inserted in conventional order.
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

  const rawRep = replacement.trim();
  if (!rawRep) return null;
  // Snippets sometimes end with a stray \end{document}; the document already has one
  const cleanRep =
    rawRep.startsWith('\\documentclass') || rawRep.includes('\\begin{document}')
      ? rawRep
      : rawRep.replace(/\s*\\end\{document\}\s*$/, '');
  if (!cleanRep) return null;

  // 3. Full Document, Body, or Preamble Replacement
  const repStartsWithClass = cleanRep.startsWith('\\documentclass');
  const repHasBegin = cleanRep.includes('\\begin{document}');
  const repHasEnd = cleanRep.includes('\\end{document}');
  const docBeginIdx = doc.indexOf('\\begin{document}');
  const docEndIdx = doc.indexOf('\\end{document}');

  if (repStartsWithClass && repHasEnd) {
    return { from: 0, to: doc.length, matchedText: doc, reason: 'full_document', confidence: 0.99 };
  }
  if (repHasBegin && !repStartsWithClass) {
    // Body only: keep the document's own preamble
    if (!repHasEnd || docBeginIdx === -1) return null; // cut-off output; never apply partially
    const to = docEndIdx !== -1 ? docEndIdx + '\\end{document}'.length : doc.length;
    return { from: docBeginIdx, to, matchedText: doc.slice(docBeginIdx, to), reason: 'full_document', confidence: 0.95 };
  }
  if (repStartsWithClass) {
    const afterBegin = repHasBegin ? cleanRep.slice(cleanRep.indexOf('\\begin{document}') + '\\begin{document}'.length) : '';
    // A full document without \end{document} was cut off; applying it would duplicate the body
    if (afterBegin.trim()) return null;
    if (docBeginIdx !== -1) {
      const endOfBeginDoc = docBeginIdx + '\\begin{document}'.length;
      return { from: 0, to: endOfBeginDoc, matchedText: doc.slice(0, endOfBeginDoc), reason: 'preamble', confidence: 0.95 };
    }
    return { from: 0, to: 0, matchedText: '', reason: 'preamble', confidence: 0.85 };
  }

  const docSections = scanSectionsInDoc(doc);
  const docBodyStart = bodyStart(doc);
  const docBodyEnd = bodyEnd(doc);

  // 4. Section-level replacement (replacement contains one or more \section{...})
  const repSections = splitReplacementSections(cleanRep);
  if (repSections.length > 0) {
    const merged = mergeBlocks(doc, sectionBlocks(doc, docSections), repSections, scoreSections, 0.5);
    if (merged) {
      return {
        from: merged.from,
        to: merged.to,
        matchedText: doc.slice(merged.from, merged.to),
        reason: merged.averageScore >= 0.9 ? 'section_match' : 'section_similarity_match',
        confidence: merged.averageScore >= 0.9 ? 0.96 : 0.9,
        replacementText: merged.text,
      };
    }

    // The document lacks this section: insert it where it conventionally belongs
    const insertIdx = findSectionInsertSlot(doc, docSections, repSections[0].kind as SectionCategory);
    const atSectionStart = docSections.some((s) => s.startIndex === insertIdx);
    return {
      from: insertIdx,
      to: insertIdx,
      matchedText: '',
      reason: 'section_insert_slot',
      confidence: 0.82,
      replacementText: atSectionStart ? `${cleanRep}\n\n` : `\n\n${cleanRep}\n`,
    };
  }

  // 5. Entry-level replacement (\resumeSubheading / \resumeProjectHeading / \cventry)
  const repEntries = extractEntries(cleanRep, 0, cleanRep.length);
  if (repEntries.length > 0) {
    const docEntries = extractEntries(doc, docBodyStart, docBodyEnd);
    const merged = mergeBlocks(doc, docEntries, repEntries, scoreEntries, 0.68);
    if (merged) {
      return {
        from: merged.from,
        to: merged.to,
        matchedText: doc.slice(merged.from, merged.to),
        reason: 'content_anchor',
        confidence: 0.94,
        replacementText: merged.text,
      };
    }

    // None of the entries exist yet
    const isProjects = repEntries.some((e) => e.kind === 'resumeProjectHeading');
    const targetSection = docSections.find((s) => s.category === (isProjects ? 'projects' : 'experience'));
    if (targetSection) {
      if (isProjects) {
        // Freshly generated projects replace the old project list
        return locateSectionBody(doc, targetSection, cleanRep);
      }
      // New jobs go on top of the experience list (most recent first)
      const listStart = targetSection.content.match(/\\resumeSubHeadingListStart/);
      const insertIdx = listStart
        ? targetSection.startIndex + listStart.index! + listStart[0].length
        : targetSection.startIndex + targetSection.headerLength;
      return {
        from: insertIdx,
        to: insertIdx,
        matchedText: '',
        reason: 'section_insert_slot',
        confidence: 0.8,
        replacementText: `\n  ${cleanRep}\n`,
      };
    }
  }

  // 6. Technical skills block without \section header
  if (/\\textbf\{(?:Languages|Frameworks|Developer Tools|Libraries|Technologies)/.test(cleanRep)) {
    const skillsSec = docSections.find((s) => s.category === 'skills');
    if (skillsSec) {
      return locateSectionBody(doc, skillsSec, cleanRep);
    }
  }

  // 7. Bullet-level replacement: rewrite only the matching bullets
  const repBullets = extractBullets(cleanRep, 0, cleanRep.length);
  if (repBullets.length > 0) {
    const docBullets = extractBullets(doc, docBodyStart, docBodyEnd);
    const merged = mergeBlocks(doc, docBullets, repBullets, scoreProse, 0.45);
    if (merged) {
      return {
        from: merged.from,
        to: merged.to,
        matchedText: doc.slice(merged.from, merged.to),
        reason: 'bullet_match',
        confidence: Math.min(0.95, 0.6 + merged.averageScore * 0.35),
        replacementText: merged.text,
      };
    }
    return null;
  }

  // 8. Prose replacement (cover letter paragraphs, summaries)
  const repParagraphs = extractParagraphs(cleanRep, 0, cleanRep.length);
  if (repParagraphs.length > 0) {
    const docParagraphs = extractParagraphs(doc, docBodyStart, docBodyEnd);
    const merged = mergeBlocks(doc, docParagraphs, repParagraphs, scoreProse, 0.4);
    if (merged) {
      return {
        from: merged.from,
        to: merged.to,
        matchedText: doc.slice(merged.from, merged.to),
        reason: 'paragraph_match',
        confidence: Math.min(0.9, 0.55 + merged.averageScore * 0.35),
        replacementText: merged.text,
      };
    }
  }

  return null;
}
