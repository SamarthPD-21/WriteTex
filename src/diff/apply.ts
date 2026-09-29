import DiffMatchPatch from 'diff-match-patch';

export interface ApplyResult {
  success: boolean;
  patchedText: string;
  appliedCount: number;
  confidence: number;
}

export interface SnippetLocation {
  from: number;
  to: number;
  matchedText: string;
}

/**
 * Safely locates a snippet inside a document, from strictest to loosest:
 * 1. Exact match (single occurrence, or the one closest to approximateIndex).
 * 2. Trimmed exact match.
 * 3. Whitespace-insensitive match (re-indented or re-wrapped snippets).
 * 4. Line-window fuzzy match (snippet was lightly edited since it was captured).
 *
 * Returns null instead of guessing when a match is ambiguous.
 */
export function findSnippetLocation(
  doc: string,
  snippet: string,
  approximateIndex?: number
): SnippetLocation | null {
  if (!doc || !snippet) return null;

  const trimmed = snippet.trim();
  if (!trimmed) return null;

  // 1 & 2. Exact occurrences of the raw, then trimmed, snippet
  for (const candidate of trimmed === snippet ? [snippet] : [snippet, trimmed]) {
    const indices = findAllIndices(doc, candidate);
    if (indices.length === 0) continue;
    if (indices.length > 1 && approximateIndex === undefined) return null;
    const from = pickClosest(indices, approximateIndex);
    return { from, to: from + candidate.length, matchedText: candidate };
  }

  // 3. Whitespace-insensitive match
  const normalized = findNormalized(doc, trimmed, approximateIndex);
  if (normalized !== undefined) return normalized;

  // 4. Fuzzy line-window match
  return findSnippetLocationFuzzy(doc, snippet, approximateIndex);
}

function findAllIndices(doc: string, needle: string): number[] {
  const indices: number[] = [];
  let pos = doc.indexOf(needle);
  while (pos !== -1) {
    indices.push(pos);
    pos = doc.indexOf(needle, pos + 1);
  }
  return indices;
}

function pickClosest(indices: number[], approximateIndex?: number): number {
  if (approximateIndex === undefined || approximateIndex < 0) return indices[0];
  let best = indices[0];
  for (const idx of indices) {
    if (Math.abs(idx - approximateIndex) < Math.abs(best - approximateIndex)) best = idx;
  }
  return best;
}

/**
 * Collapses every whitespace run to a single space and records, for each
 * normalized character, its offset in the original text.
 */
function normalizeWithMap(text: string): { normalized: string; map: number[] } {
  let normalized = '';
  const map: number[] = [];
  let inSpace = false;
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) {
      if (!inSpace && normalized.length > 0) {
        normalized += ' ';
        map.push(i);
      }
      inSpace = true;
    } else {
      normalized += text[i];
      map.push(i);
      inSpace = false;
    }
  }
  return { normalized, map };
}

/**
 * Returns a location, null when the snippet occurs several times with no way
 * to disambiguate, or undefined when it does not occur at all.
 */
function findNormalized(
  doc: string,
  trimmed: string,
  approximateIndex?: number
): SnippetLocation | null | undefined {
  const needle = trimmed.replace(/\s+/g, ' ');
  const { normalized, map } = normalizeWithMap(doc);
  const hits = findAllIndices(normalized, needle);
  if (hits.length === 0) return undefined;

  const locations = hits.map((h) => ({ from: map[h], to: map[h + needle.length - 1] + 1 }));
  if (locations.length > 1 && approximateIndex === undefined) return null;
  const from = pickClosest(locations.map((l) => l.from), approximateIndex);
  const to = locations.find((l) => l.from === from)!.to;
  return { from, to, matchedText: doc.slice(from, to) };
}

/** Character-level similarity in [0, 1] based on Levenshtein distance. */
export function textSimilarity(a: string, b: string): number {
  const x = a.replace(/\s+/g, ' ').trim();
  const y = b.replace(/\s+/g, ' ').trim();
  if (x === y) return 1;
  const maxLen = Math.max(x.length, y.length);
  if (maxLen === 0) return 1;
  const dmp = new DiffMatchPatch();
  dmp.Diff_Timeout = 0.2;
  const diffs = dmp.diff_main(x, y);
  return 1 - dmp.diff_levenshtein(diffs) / maxLen;
}

/**
 * Full-document fuzzy search for a snippet whose text drifted slightly
 * (a word was edited, a macro lost its backslash, etc.). Compares the snippet
 * against every window of lines of similar size and takes the best one.
 */
export function findSnippetLocationFuzzy(
  doc: string,
  snippet: string,
  approximateIndex?: number
): SnippetLocation | null {
  if (!doc || !snippet) return null;
  const trimmed = snippet.trim();
  if (trimmed.length < 8) return null;

  // Line table with offsets of first/last non-whitespace characters
  const lines: { start: number; end: number }[] = [];
  let offset = 0;
  for (const raw of doc.split('\n')) {
    const lead = raw.length - raw.trimStart().length;
    lines.push({ start: offset + lead, end: offset + raw.trimEnd().length });
    offset += raw.length + 1;
  }

  const snippetLineCount = trimmed.split('\n').length;
  const targetLen = trimmed.replace(/\s+/g, ' ').length;

  type Candidate = { from: number; to: number; score: number };
  const candidates: Candidate[] = [];

  for (const size of new Set([snippetLineCount - 1, snippetLineCount, snippetLineCount + 1])) {
    if (size < 1) continue;
    for (let i = 0; i + size <= lines.length; i++) {
      const from = lines[i].start;
      const to = lines[i + size - 1].end;
      if (to <= from) continue;
      const windowText = doc.slice(from, to);
      const windowLen = windowText.replace(/\s+/g, ' ').length;
      if (windowLen < targetLen * 0.7 || windowLen > targetLen * 1.4) continue;

      const score = textSimilarity(windowText, trimmed);
      if (score >= 0.75) candidates.push({ from, to, score });
    }
  }

  if (candidates.length === 0) return null;

  // Prefer windows near the expected position when we know it
  const rank = (c: Candidate) => {
    if (approximateIndex === undefined || approximateIndex < 0) return c.score;
    const distance = Math.abs(c.from - approximateIndex);
    return c.score - Math.min(distance / Math.max(doc.length, 1), 1) * 0.1;
  };
  candidates.sort((a, b) => rank(b) - rank(a));
  const best = candidates[0];

  // Far from the expected position, demand a stronger match
  if (approximateIndex !== undefined && Math.abs(best.from - approximateIndex) > 2000 && best.score < 0.85) {
    return null;
  }

  // Refuse to guess between two distinct, equally good locations
  const rival = candidates.find(
    (c) => (c.to <= best.from || c.from >= best.to) && Math.abs(rank(c) - rank(best)) < 0.01
  );
  if (rival && approximateIndex === undefined) return null;

  return { from: best.from, to: best.to, matchedText: doc.slice(best.from, best.to) };
}

/**
 * Applies a replacement text to a target document SAFELY.
 * NEVER mutates or corrupts unrelated sections of the document.
 */
export function applyFuzzyPatch(
  originalDoc: string,
  originalSnippet: string,
  replacementSnippet: string,
  approximateIndex?: number
): ApplyResult {
  const loc = findSnippetLocation(originalDoc, originalSnippet, approximateIndex);
  if (!loc) {
    return {
      success: false,
      patchedText: originalDoc,
      appliedCount: 0,
      confidence: 0,
    };
  }

  const patchedText =
    originalDoc.slice(0, loc.from) +
    replacementSnippet +
    originalDoc.slice(loc.to);

  return {
    success: true,
    patchedText,
    appliedCount: 1,
    confidence: 1.0,
  };
}
