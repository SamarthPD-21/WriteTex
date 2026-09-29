import { locateWrongSnippetInDoc, ReplacementReason, scanSectionsInDoc } from './smart-replace';

export type PlanReason = ReplacementReason | 'selection' | 'undo';

/**
 * A single, fully resolved edit: exactly which text is replaced by exactly which
 * text. The diff the user reviews, the write into Overleaf, and the undo are all
 * derived from the same plan, so what you see is what gets applied.
 */
export interface EditPlan {
  fileName: string;
  from: number;
  to: number;
  /** Document text in [from, to) when the plan was made. */
  originalText: string;
  /** Text that will be written into [from, to). */
  newText: string;
  reason: PlanReason;
  confidence: number;
  /** Human-readable summary of where the edit lands. */
  description: string;
  startLine: number;
  endLine: number;
  /** Surrounding text, used to re-find the target if the document changes. */
  contextBefore: string;
  contextAfter: string;
}

const CONTEXT_CHARS = 60;

function lineOf(doc: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < doc.length; i++) {
    if (doc.charCodeAt(i) === 10) line++;
  }
  return line;
}

function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

function stripMacros(text: string): string {
  return text
    .replace(/\\[a-zA-Z@]+\*?/g, ' ')
    .replace(/[{}$|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function entryNames(text: string): string[] {
  const names: string[] = [];
  for (const m of text.matchAll(/(?:resumeSubheading|resumeProjectHeading|cventry)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
    const name = stripMacros(m[1]).split(' | ')[0].trim();
    if (name) names.push(name);
  }
  return names;
}

function describe(doc: string, reason: PlanReason, from: number, originalText: string, newText: string): string {
  const quoted = (items: string[]) => items.slice(0, 3).map((t) => `“${t}”`).join(', ') + (items.length > 3 ? ` +${items.length - 3} more` : '');
  const sectionTitles = (text: string) => scanSectionsInDoc(text).map((s) => stripMacros(s.title));
  const enclosingSection = () => {
    const sec = scanSectionsInDoc(doc).filter((s) => s.startIndex <= from).pop();
    return sec ? stripMacros(sec.title) : undefined;
  };

  switch (reason) {
    case 'selection':
      return 'Replaces your selection';
    case 'undo':
      return 'Reverts a WriteTex edit';
    case 'full_document':
      return 'Rewrites the whole document';
    case 'preamble':
      return originalText ? 'Replaces the preamble' : 'Adds a preamble';
    case 'section_match':
    case 'section_similarity_match': {
      const titles = sectionTitles(originalText);
      return titles.length > 0 ? `Rewrites the ${quoted(titles)} ${titles.length === 1 ? 'section' : 'sections'}` : 'Rewrites a section';
    }
    case 'section_body_match': {
      const title = enclosingSection();
      return title ? `Replaces the contents of “${title}”` : 'Replaces a section body';
    }
    case 'section_insert_slot': {
      const added = sectionTitles(newText);
      if (added.length > 0) return `Adds a new ${quoted(added)} section`;
      const names = entryNames(newText);
      const title = enclosingSection();
      return `Adds ${names.length > 0 ? quoted(names) : 'new content'}${title ? ` to “${title}”` : ''}`;
    }
    case 'content_anchor': {
      const names = entryNames(originalText);
      return names.length > 0 ? `Updates ${plural(names.length, 'entry', 'entries')}: ${quoted(names)}` : 'Updates a matching entry';
    }
    case 'bullet_match': {
      // Count bullets that actually change; untouched ones inside the span are kept verbatim
      const bullets = originalText.split('\n').map((l) => l.trim()).filter((l) => /^\\?(?:resumeItem\{|item(?![A-Za-z]))/.test(l.replace(/^\\/, '\\')));
      const kept = new Set(newText.split('\n').map((l) => l.trim()));
      const count = bullets.filter((b) => !kept.has(b)).length;
      const title = enclosingSection();
      return `Rewrites ${plural(Math.max(count, 1), 'bullet')}${title ? ` in “${title}”` : ''}`;
    }
    case 'paragraph_match': {
      const count = originalText.split(/\n[ \t]*\n/).filter((p) => p.trim()).length;
      return `Rewrites ${plural(count, 'paragraph')}`;
    }
    default:
      return 'Replaces the original snippet';
  }
}

export function createPlan(
  doc: string,
  from: number,
  to: number,
  newText: string,
  reason: PlanReason,
  confidence: number,
  fileName: string
): EditPlan {
  const originalText = doc.slice(from, to);
  return {
    fileName,
    from,
    to,
    originalText,
    newText,
    reason,
    confidence,
    description: describe(doc, reason, from, originalText, newText),
    startLine: lineOf(doc, from),
    endLine: lineOf(doc, Math.max(from, to - 1)),
    contextBefore: doc.slice(Math.max(0, from - CONTEXT_CHARS), from),
    contextAfter: doc.slice(to, to + CONTEXT_CHARS),
  };
}

export interface PlanOptions {
  fileName: string;
  /** Editor selection captured when the request was made. */
  selection?: { from: number; to: number; text: string } | null;
  approximateIndex?: number;
}

/**
 * Decides where model output goes in `doc`. A captured selection wins; otherwise
 * the smart locator finds the section / entry / bullets / paragraphs being rewritten.
 * Returns null when there is no safe target.
 */
export function planEdit(doc: string, output: string, options: PlanOptions): EditPlan | null {
  if (!output.trim()) return null;
  const sel = options.selection;

  if (sel && sel.to > sel.from && doc.slice(sel.from, sel.to) === sel.text) {
    // Keep the selection's surrounding whitespace so indentation and line breaks survive
    const lead = sel.text.match(/^\s*/)![0];
    const trail = sel.text.trim() ? sel.text.match(/\s*$/)![0] : '';
    return createPlan(doc, sel.from, sel.to, lead + output.trim() + trail, 'selection', 1, options.fileName);
  }

  const loc = locateWrongSnippetInDoc(doc, output, {
    approximateIndex: options.approximateIndex,
    originalSnippet: sel && sel.text.trim() ? sel.text : undefined,
  });
  if (!loc) return null;
  return createPlan(doc, loc.from, loc.to, loc.replacementText ?? output, loc.reason, loc.confidence, options.fileName);
}

function contextScore(doc: string, at: number, end: number, plan: EditPlan): number {
  const before = doc.slice(Math.max(0, at - plan.contextBefore.length), at);
  const after = doc.slice(end, end + plan.contextAfter.length);
  let score = 0;
  for (let i = 1; i <= Math.min(before.length, plan.contextBefore.length); i++) {
    if (before[before.length - i] !== plan.contextBefore[plan.contextBefore.length - i]) break;
    score++;
  }
  for (let i = 0; i < Math.min(after.length, plan.contextAfter.length); i++) {
    if (after[i] !== plan.contextAfter[i]) break;
    score++;
  }
  return score;
}

/**
 * Re-finds a plan's target in the current document (the user may have typed
 * elsewhere since it was made). The target text must still exist verbatim —
 * edits the user made inside the target are never overwritten.
 */
export function rebasePlan(doc: string, plan: EditPlan): { from: number; to: number } | null {
  const fullContext = plan.contextBefore.length + plan.contextAfter.length;
  const inPlace =
    doc.slice(plan.from, plan.to) === plan.originalText &&
    contextScore(doc, plan.from, plan.to, plan) === fullContext;
  if (inPlace) return { from: plan.from, to: plan.to };

  if (plan.originalText) {
    const candidates: number[] = [];
    let pos = doc.indexOf(plan.originalText);
    while (pos !== -1) {
      candidates.push(pos);
      pos = doc.indexOf(plan.originalText, pos + 1);
    }
    if (candidates.length === 0) return null;
    const scored = candidates
      .map((c) => ({ c, score: contextScore(doc, c, c + plan.originalText.length, plan) }))
      .sort((a, b) => b.score - a.score || Math.abs(a.c - plan.from) - Math.abs(b.c - plan.from));
    // Several identical candidates with no distinguishing context: don't guess
    if (scored.length > 1 && scored[0].score === scored[1].score && scored[0].score === 0) return null;
    return { from: scored[0].c, to: scored[0].c + plan.originalText.length };
  }

  // Pure insertion: anchor on the surrounding text
  const anchor = plan.contextBefore + plan.contextAfter;
  if (anchor.trim()) {
    const idx = doc.indexOf(anchor);
    if (idx !== -1 && doc.indexOf(anchor, idx + 1) === -1) {
      const at = idx + plan.contextBefore.length;
      return { from: at, to: at };
    }
    if (plan.contextBefore.trim()) {
      const b = doc.indexOf(plan.contextBefore);
      if (b !== -1 && doc.indexOf(plan.contextBefore, b + 1) === -1) {
        const at = b + plan.contextBefore.length;
        return { from: at, to: at };
      }
    }
  }
  return null;
}

/** The plan that reverts `plan` after it was applied at `appliedFrom`. */
export function invertPlan(plan: EditPlan, appliedFrom: number): EditPlan {
  return {
    ...plan,
    from: appliedFrom,
    to: appliedFrom + plan.newText.length,
    originalText: plan.newText,
    newText: plan.originalText,
    reason: 'undo',
    confidence: 1,
    description: `Undo: ${plan.description}`,
  };
}
