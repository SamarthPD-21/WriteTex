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
 * Safely locates a snippet inside a document.
 * 1. Exact match (single occurrence).
 * 2. Exact match with proximity if multiple occurrences exist and approximateIndex is provided.
 * 3. Whitespace-normalized match.
 * 4. Localized search strictly near approximateIndex.
 *
 * NEVER matches offset 0 when the snippet is elsewhere in the document.
 */
export function findSnippetLocation(
  doc: string,
  snippet: string,
  approximateIndex?: number
): SnippetLocation | null {
  if (!doc || !snippet) return null;

  const rawSnippet = snippet;
  const trimmed = snippet.trim();
  if (!trimmed) return null;

  // 1. Try finding all exact occurrences of rawSnippet
  const indices: number[] = [];
  let pos = doc.indexOf(rawSnippet, 0);
  while (pos !== -1) {
    indices.push(pos);
    pos = doc.indexOf(rawSnippet, pos + 1);
  }

  if (indices.length === 1) {
    return {
      from: indices[0],
      to: indices[0] + rawSnippet.length,
      matchedText: rawSnippet,
    };
  }

  if (indices.length > 1) {
    if (approximateIndex !== undefined && approximateIndex >= 0) {
      let closest = indices[0];
      let minDist = Math.abs(indices[0] - approximateIndex);
      for (let i = 1; i < indices.length; i++) {
        const d = Math.abs(indices[i] - approximateIndex);
        if (d < minDist) {
          minDist = d;
          closest = indices[i];
        }
      }
      return {
        from: closest,
        to: closest + rawSnippet.length,
        matchedText: rawSnippet,
      };
    }
    // Ambiguous multiple occurrences without approximate index
    return null;
  }

  // 2. Try trimmed snippet if raw snippet has different leading/trailing whitespace
  if (trimmed !== rawSnippet) {
    const trimmedIndices: number[] = [];
    let tPos = doc.indexOf(trimmed, 0);
    while (tPos !== -1) {
      trimmedIndices.push(tPos);
      tPos = doc.indexOf(trimmed, tPos + 1);
    }

    if (trimmedIndices.length === 1) {
      return {
        from: trimmedIndices[0],
        to: trimmedIndices[0] + trimmed.length,
        matchedText: trimmed,
      };
    }

    if (trimmedIndices.length > 1 && approximateIndex !== undefined) {
      let closest = trimmedIndices[0];
      let minDist = Math.abs(trimmedIndices[0] - approximateIndex);
      for (let i = 1; i < trimmedIndices.length; i++) {
        const d = Math.abs(trimmedIndices[i] - approximateIndex);
        if (d < minDist) {
          minDist = d;
          closest = trimmedIndices[i];
        }
      }
      return {
        from: closest,
        to: closest + trimmed.length,
        matchedText: trimmed,
      };
    }
  }

  // 3. Localized search strictly around approximateIndex
  if (approximateIndex !== undefined && approximateIndex >= 0 && approximateIndex < doc.length) {
    const dmp = new DiffMatchPatch();
    dmp.Match_Threshold = 0.4; // Strict threshold to prevent false matches
    dmp.Match_Distance = 250;

    const windowStart = Math.max(0, approximateIndex - 300);
    const windowEnd = Math.min(doc.length, approximateIndex + trimmed.length + 300);
    const localSlice = doc.slice(windowStart, windowEnd);

    const relativeMatch = dmp.match_main(localSlice, trimmed, approximateIndex - windowStart);
    if (relativeMatch !== -1) {
      const matchIdx = windowStart + relativeMatch;
      return {
        from: matchIdx,
        to: matchIdx + trimmed.length,
        matchedText: doc.slice(matchIdx, matchIdx + trimmed.length),
      };
    }
  }

  return null;
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
