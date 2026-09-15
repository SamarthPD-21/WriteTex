import DiffMatchPatch from 'diff-match-patch';

export interface ApplyResult {
  success: boolean;
  patchedText: string;
  appliedCount: number;
  confidence: number;
}

/**
 * Applies a replacement text to a target document using fuzzy matching
 * if the exact coordinates or text moved slightly due to concurrent edits.
 */
export function applyFuzzyPatch(
  originalDoc: string,
  originalSnippet: string,
  replacementSnippet: string,
  matchThreshold = 0.6
): ApplyResult {
  // 1. Direct exact replacement if originalSnippet exists uniquely
  const exactIndex = originalDoc.indexOf(originalSnippet);
  if (exactIndex !== -1) {
    // Check if it's unique or if there are multiple occurrences
    const secondIndex = originalDoc.indexOf(originalSnippet, exactIndex + 1);
    if (secondIndex === -1) {
      const patchedText =
        originalDoc.slice(0, exactIndex) +
        replacementSnippet +
        originalDoc.slice(exactIndex + originalSnippet.length);
      return {
        success: true,
        patchedText,
        appliedCount: 1,
        confidence: 1.0,
      };
    }
  }

  // 2. Diff-Match-Patch fuzzy patch
  const dmp = new DiffMatchPatch();
  dmp.Match_Threshold = matchThreshold;
  dmp.Match_Distance = 1000;

  // Create patch from originalSnippet to replacementSnippet
  const patchList = dmp.patch_make(originalSnippet, replacementSnippet);
  if (patchList.length === 0) {
    return {
      success: false,
      patchedText: originalDoc,
      appliedCount: 0,
      confidence: 0,
    };
  }

  // Apply patch to the full document
  const [patchedText, results] = dmp.patch_apply(patchList, originalDoc);
  const successCount = results.filter(Boolean).length;
  const isSuccess = successCount === results.length && results.length > 0;

  return {
    success: isSuccess,
    patchedText,
    appliedCount: successCount,
    confidence: results.length > 0 ? successCount / results.length : 0,
  };
}
