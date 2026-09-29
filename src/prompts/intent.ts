/**
 * True when the user is asking a question rather than requesting an edit. Such
 * answers are shown as prose and never written into the document.
 */
export function isExplanationQuery(userQuery: string, presetKey?: string): boolean {
  if (presetKey === 'explain') return true;
  const q = userQuery
    .trim()
    .replace(/^(?:\[[^\]]*\]\s*)+/, '') // "[Target Role: ...]" prefixes added by the UI
    .toLowerCase();
  return /^(?:explain|what(?:'s| is| are| does| do)\b|how (?:does|do|is|are)\b|why\b|should i\b|is (?:this|my|it|there)\b|does (?:this|my|it)\b|can you explain)/.test(q);
}
