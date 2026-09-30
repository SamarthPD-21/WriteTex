/**
 * ATS readiness scoring for LaTeX resumes.
 *
 * There is no single "ATS score": Workday, Greenhouse, Lever, Taleo and others
 * parse differently. This estimates how well a resume survives the steps they
 * share — PDF text extraction, section detection, keyword matching — plus the
 * content signals recruiters screen for. Every deduction is reported as an
 * issue with a concrete fix, so the number is explainable.
 */
import { analyzeKeywordGap, stripLatexMarkup } from './keyword-gap';
import { getSectionCategory, scanSectionsInDoc } from '../diff/smart-replace';

export type AtsCategoryId = 'keywords' | 'parsing' | 'structure' | 'content';
export type AtsSeverity = 'critical' | 'warning' | 'info';

export type AtsFix =
  | { kind: 'ai'; label: string; prompt: string }
  | { kind: 'patch'; label: string; patch: 'unicode-mapping' };

export interface AtsIssue {
  id: string;
  category: AtsCategoryId;
  severity: AtsSeverity;
  title: string;
  detail: string;
  fix?: AtsFix;
}

export interface AtsCategory {
  id: AtsCategoryId;
  label: string;
  /** 0–100 */
  score: number;
  /** Share of the overall score, 0–1 (0 when the category is not scored). */
  weight: number;
}

export interface AtsReport {
  /** 0–100 */
  score: number;
  rating: 'Strong' | 'Good' | 'Needs work' | 'Weak';
  categories: AtsCategory[];
  issues: AtsIssue[];
  /** True when no job description was given, so keywords were not scored. */
  keywordsSkipped: boolean;
  stats: {
    bullets: number;
    quantifiedPercent: number;
    actionVerbPercent: number;
    words: number;
    keywordPercent: number | null;
  };
}

export interface AtsInput {
  latex: string;
  jobDescription?: string;
  targetRole?: string;
  /** Overleaf reported compile errors; an ATS receives nothing from a failed build. */
  hasCompileErrors?: boolean;
}

const WEIGHTS: Record<AtsCategoryId, number> = { keywords: 0.35, parsing: 0.25, structure: 0.15, content: 0.25 };
const LABELS: Record<AtsCategoryId, string> = {
  keywords: 'Keyword match',
  parsing: 'Parseability',
  structure: 'Sections & contact',
  content: 'Content quality',
};

// Common resume action verbs (past tense); anything ending in -ed also counts
const ACTION_VERBS = new Set(
  (
    'led built drove ran won cut grew made set shipped wrote designed developed engineered architected implemented created ' +
    'launched delivered improved increased reduced decreased optimized accelerated automated streamlined scaled migrated ' +
    'refactored deployed integrated owned spearheaded orchestrated established founded initiated pioneered introduced ' +
    'mentored coached managed directed supervised coordinated partnered collaborated negotiated secured analyzed researched ' +
    'evaluated identified diagnosed resolved debugged tested validated benchmarked modeled forecasted published presented ' +
    'taught trained authored drafted redesigned rebuilt consolidated standardized modernized transformed overhauled ' +
    'boosted saved generated achieved exceeded earned expanded prototyped modeled instrumented monitored hardened secured'
  ).split(/\s+/)
);
const WEAK_PHRASES = /\b(responsible for|helped( with)?|assisted( in| with)?|worked on|involved in|participated in|tasked with|duties included)\b/i;
const PLACEHOLDER = /\[(?:X|N|Y|Z|\d*X)[^\]]{0,20}\]/;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Bullet texts: \resumeItem{...} (brace-balanced) and \item lines. */
export function extractBulletTexts(latex: string): string[] {
  const body = latex.includes('\\begin{document}') ? latex.slice(latex.indexOf('\\begin{document}')) : latex;
  const bullets: string[] = [];
  const re = /\\resumeItem\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < body.length && depth > 0; i++) {
      if (body[i] === '\\') i++;
      else if (body[i] === '{') depth++;
      else if (body[i] === '}') depth--;
    }
    bullets.push(body.slice(m.index + m[0].length, i - 1));
  }
  for (const line of body.matchAll(/^[ \t]*\\item\s+(?!\\resume)([^\n]+)$/gm)) {
    bullets.push(line[1]);
  }
  return bullets.map((b) => stripLatexMarkup(b).trim()).filter((b) => b.split(/\s+/).length >= 3);
}

function startsWithActionVerb(bullet: string): boolean {
  const first = bullet.replace(/^[^a-z]+/i, '').split(/[\s,:;]+/)[0]?.toLowerCase() || '';
  return ACTION_VERBS.has(first) || (/ed$/.test(first) && first.length > 4);
}

export function scoreAtsReadiness(input: AtsInput): AtsReport {
  const latex = input.latex || '';
  const issues: AtsIssue[] = [];
  const add = (issue: AtsIssue) => issues.push(issue);

  const preambleEnd = latex.indexOf('\\begin{document}');
  const preamble = preambleEnd === -1 ? '' : latex.slice(0, preambleEnd);
  const body = preambleEnd === -1 ? latex : latex.slice(preambleEnd);
  const plain = stripLatexMarkup(body);
  const words = plain.split(/\s+/).filter((w) => /[a-z]/.test(w)).length;

  // ---------------- Parseability ----------------
  let parsing = 100;
  const unicodeEngine = /\\usepackage(?:\[[^\]]*\])?\{fontspec\}/.test(preamble);
  if (preambleEnd !== -1 && !unicodeEngine && !/\\pdfgentounicode\s*=\s*1/.test(preamble)) {
    parsing -= 30;
    add({
      id: 'unicode-mapping',
      category: 'parsing',
      severity: 'critical',
      title: 'PDF text may extract as gibberish',
      detail:
        'Without \\input{glyphtounicode} and \\pdfgentounicode=1, pdfLaTeX PDFs can copy out as broken characters (e.g. ligatures like “ﬁ”), so an ATS may misread words.',
      fix: { kind: 'patch', label: 'Add unicode mapping', patch: 'unicode-mapping' },
    });
  }
  if (input.hasCompileErrors) {
    parsing -= 25;
    add({
      id: 'compile-errors',
      category: 'parsing',
      severity: 'critical',
      title: 'The document has compile errors',
      detail: 'Fix them before submitting — an outdated or missing PDF is what the ATS receives.',
      fix: { kind: 'ai', label: 'Fix with AI', prompt: 'Fix the LaTeX compile errors in this document without changing its content.' },
    });
  }
  if (/\\usepackage(?:\[[^\]]*\])?\{(?:fontawesome5?|academicons)\}|\\fa[A-Z][A-Za-z]*\b|\\(?:Mobilefone|Letter|Telefon|Email|Mundus)\b/.test(latex)) {
    parsing -= 10;
    add({
      id: 'icons',
      category: 'parsing',
      severity: 'warning',
      title: 'Icons in the text',
      detail: 'Icon glyphs (fontawesome, marvosym) extract as odd characters and can break how an ATS reads your contact line. Prefer plain labels like “Email:”.',
    });
  }
  if (/\\includegraphics/.test(body)) {
    parsing -= 10;
    add({
      id: 'images',
      category: 'parsing',
      severity: 'warning',
      title: 'Images in the resume',
      detail: 'Any text inside an image (logos, charts, a photo caption) is invisible to an ATS. Many ATS guides also advise against photos.',
    });
  }
  if (/\\begin\{(?:multicols|paracol)\}|\\usepackage(?:\[[^\]]*\])?\{(?:multicol|paracol)\}/.test(latex) || (body.match(/\\begin\{minipage\}/g) || []).length >= 2) {
    parsing -= 15;
    add({
      id: 'columns',
      category: 'parsing',
      severity: 'warning',
      title: 'Multi-column layout',
      detail: 'Side-by-side columns can be read left-to-right across both columns, mixing sections together. A single column parses most reliably.',
    });
  }
  if (/\\begin\{tikzpicture\}/.test(body)) {
    parsing -= 5;
    add({
      id: 'tikz',
      category: 'parsing',
      severity: 'info',
      title: 'TikZ graphics',
      detail: 'Skill bars and other drawings carry no readable text; state the skill level in words if it matters.',
    });
  }

  // ---------------- Sections & contact ----------------
  let structure = 100;
  const sections = scanSectionsInDoc(latex).filter((s) => /\\section/.test(s.content.slice(0, s.headerLength + 1)));
  const categories = new Set(sections.map((s) => s.category));
  const requireSection = (cat: string, label: string, penalty: number, severity: AtsSeverity) => {
    if (categories.has(cat as never)) return;
    structure -= penalty;
    add({
      id: `missing-${cat}`,
      category: 'structure',
      severity,
      title: `No “${label}” section found`,
      detail: `ATS systems map content by standard headings. Use a heading such as “${label}”.`,
    });
  };
  if (sections.length > 0) {
    requireSection('experience', 'Experience', 30, 'critical');
    requireSection('education', 'Education', 20, 'warning');
    requireSection('skills', 'Skills', 15, 'warning');
    const unusual = sections.filter((s) => getSectionCategory(s.title) === 'other').map((s) => s.title.replace(/\\[a-zA-Z]+|[{}]/g, '').trim());
    if (unusual.length > 0) {
      structure -= Math.min(10, unusual.length * 5);
      add({
        id: 'unusual-headings',
        category: 'structure',
        severity: 'info',
        title: `Non-standard heading${unusual.length > 1 ? 's' : ''}: ${unusual.slice(0, 3).map((t) => `“${t}”`).join(', ')}`,
        detail: 'Creative headings may not be recognized. Standard names (Experience, Projects, Skills, Education, Awards) are safest.',
      });
    }
  } else if (preambleEnd !== -1) {
    structure -= 40;
    add({
      id: 'no-sections',
      category: 'structure',
      severity: 'critical',
      title: 'No section headings found',
      detail: 'Use \\section{...} headings (Experience, Education, Skills) so the ATS can split your resume into fields.',
    });
  }

  const header = sections.length > 0 ? latex.slice(Math.max(0, preambleEnd), sections[0].startIndex) : body.slice(0, 1500);
  if (!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(header)) {
    structure -= 20;
    add({ id: 'no-email', category: 'structure', severity: 'critical', title: 'No email address in the header', detail: 'Recruiters and ATS contact fields need a plain-text email near your name.' });
  }
  if (!/(?:\+?\d[\d\s().-]{8,}\d)/.test(header)) {
    structure -= 10;
    add({ id: 'no-phone', category: 'structure', severity: 'warning', title: 'No phone number in the header', detail: 'Most ATS forms expect a phone number; include one in plain text.' });
  }
  if (!/linkedin\.com\//i.test(header)) {
    structure -= 5;
    add({ id: 'no-linkedin', category: 'structure', severity: 'info', title: 'No LinkedIn URL', detail: 'A linkedin.com/in/… link is commonly parsed into its own field.' });
  }

  // ---------------- Content quality ----------------
  let content = 100;
  const bullets = extractBulletTexts(latex);
  const withVerb = bullets.filter(startsWithActionVerb);
  const quantified = bullets.filter((b) => /\d/.test(b));
  const weak = bullets.filter((b) => WEAK_PHRASES.test(b));
  const long = bullets.filter((b) => b.length > 220);
  const actionVerbPercent = bullets.length ? Math.round((withVerb.length / bullets.length) * 100) : 0;
  const quantifiedPercent = bullets.length ? Math.round((quantified.length / bullets.length) * 100) : 0;

  const placeholders = (body.match(new RegExp(PLACEHOLDER.source, 'g')) || []).length;
  if (placeholders > 0) {
    content -= 25;
    add({
      id: 'placeholders',
      category: 'content',
      severity: 'critical',
      title: `${placeholders} unfilled placeholder${placeholders > 1 ? 's' : ''} like “[X%]”`,
      detail: 'Replace every placeholder with your real number before sending, or remove the claim.',
    });
  }
  if (bullets.length === 0) {
    content -= 40;
    add({ id: 'no-bullets', category: 'content', severity: 'warning', title: 'No bullet points found', detail: 'Describe each role with 2–5 achievement bullets.' });
  } else {
    if (actionVerbPercent < 80) {
      content -= Math.round((80 - actionVerbPercent) * 0.4);
      add({
        id: 'action-verbs',
        category: 'content',
        severity: actionVerbPercent < 50 ? 'warning' : 'info',
        title: `${bullets.length - withVerb.length} bullet${bullets.length - withVerb.length === 1 ? '' : 's'} don’t start with an action verb`,
        detail: 'Lead with verbs like “Built”, “Reduced”, “Led” — recruiters skim the first word.',
        fix: { kind: 'ai', label: 'Rewrite openers', prompt: 'Rewrite the resume bullets that do not start with a strong past-tense action verb so that they do. Keep every fact and number; change nothing else. Return only the rewritten \\resumeItem lines.' },
      });
    }
    if (quantifiedPercent < 50) {
      content -= Math.round((50 - quantifiedPercent) * 0.5);
      add({
        id: 'quantify',
        category: 'content',
        severity: quantifiedPercent < 25 ? 'warning' : 'info',
        title: `Only ${quantifiedPercent}% of bullets include a number`,
        detail: 'Numbers (scale, %, time saved, users) make impact concrete. Aim for at least half of your bullets.',
        fix: { kind: 'ai', label: 'Add metrics', prompt: 'For bullets without any number, add a measurable result. Never invent figures: where the real number is unknown, insert a clearly marked placeholder like \\textbf{[X\\%]}. Return only the changed \\resumeItem lines.' },
      });
    }
    if (weak.length > 0) {
      content -= Math.min(15, weak.length * 5);
      add({
        id: 'weak-phrases',
        category: 'content',
        severity: 'warning',
        title: `${weak.length} bullet${weak.length > 1 ? 's use' : ' uses'} weak phrasing (“responsible for”, “helped”)`,
        detail: 'Say what you did and what changed instead of describing duties.',
        fix: { kind: 'ai', label: 'Strengthen', prompt: 'Rewrite the bullets that use weak phrasing such as "responsible for", "helped", "worked on" or "assisted" into direct achievement statements. Keep every fact. Return only those \\resumeItem lines.' },
      });
    }
    if (long.length > 0) {
      content -= Math.min(10, long.length * 3);
      add({
        id: 'long-bullets',
        category: 'content',
        severity: 'info',
        title: `${long.length} bullet${long.length > 1 ? 's are' : ' is'} longer than two lines`,
        detail: 'Long bullets get skimmed; keep each to one or two lines.',
        fix: { kind: 'ai', label: 'Tighten', prompt: 'Shorten the resume bullets longer than about 200 characters to at most two lines each, keeping the key technology and result. Return only those \\resumeItem lines.' },
      });
    }
  }
  if (words > 0 && words < 250) {
    content -= 10;
    add({ id: 'too-short', category: 'content', severity: 'info', title: `Short resume (${words} words)`, detail: 'Under ~250 words usually leaves out keywords and impact. Add detail to your strongest roles and projects.' });
  } else if (words > 1100) {
    content -= 10;
    add({ id: 'too-long', category: 'content', severity: 'info', title: `Long resume (${words} words)`, detail: 'Past ~1,100 words most early-career resumes spill onto a second page. Trim older or less relevant bullets.' });
  }

  // ---------------- Keywords ----------------
  const hasJd = Boolean(input.jobDescription && input.jobDescription.trim().length > 20);
  let keywords = 0;
  let keywordPercent: number | null = null;
  if (hasJd) {
    const gap = analyzeKeywordGap(input.jobDescription!, latex, input.targetRole);
    keywordPercent = gap.totalJdKeywords > 0 ? gap.weightedMatchPercentage : null;
    keywords = keywordPercent ?? 100;
    if (gap.missingKeywords.length > 0) {
      add({
        id: 'missing-keywords',
        category: 'keywords',
        severity: gap.weightedMatchPercentage < 60 ? 'critical' : 'warning',
        title: `Missing job keywords: ${gap.missingKeywords.slice(0, 5).join(', ')}${gap.missingKeywords.length > 5 ? ` +${gap.missingKeywords.length - 5}` : ''}`,
        detail: 'ATS ranking and recruiter searches look for the job’s own terms. Add the ones you genuinely have, using the job’s spelling.',
        fix: { kind: 'ai', label: 'Weave in', prompt: gap.suggestedPrompt },
      });
    }
    const role = (input.targetRole || '').trim();
    if (role) {
      const roleWords = role.toLowerCase().replace(/\b(senior|sr|junior|jr|lead|staff|principal|ii|iii|i)\b/g, '').split(/\W+/).filter((w) => w.length > 2);
      const lowerPlain = plain.toLowerCase();
      const covered = roleWords.filter((w) => lowerPlain.includes(w)).length;
      if (roleWords.length > 0 && covered < roleWords.length) {
        keywords = Math.max(0, keywords - 10);
        add({
          id: 'job-title',
          category: 'keywords',
          severity: 'info',
          title: `The target title “${role}” doesn’t appear in your resume`,
          detail: 'Many ATS rank by job-title match. If it’s accurate, mirror the title in a summary line or a matching past title.',
        });
      }
    }
  }

  // ---------------- Combine ----------------
  const raw: Record<AtsCategoryId, number> = { keywords, parsing: clamp(parsing), structure: clamp(structure), content: clamp(content) };
  const activeWeight = hasJd ? 1 : 1 - WEIGHTS.keywords;
  const categoryList: AtsCategory[] = (Object.keys(WEIGHTS) as AtsCategoryId[]).map((id) => ({
    id,
    label: LABELS[id],
    score: clamp(raw[id]),
    weight: id === 'keywords' && !hasJd ? 0 : WEIGHTS[id] / activeWeight,
  }));
  const score = clamp(categoryList.reduce((sum, c) => sum + c.score * c.weight, 0));

  const severityRank: Record<AtsSeverity, number> = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    score,
    // A single critical problem (no email, unreadable PDF text…) can sink an application on its own
    rating: issues.some((i) => i.severity === 'critical')
      ? score >= 50
        ? 'Needs work'
        : 'Weak'
      : score >= 85
      ? 'Strong'
      : score >= 70
      ? 'Good'
      : score >= 50
      ? 'Needs work'
      : 'Weak',
    categories: categoryList,
    issues,
    keywordsSkipped: !hasJd,
    stats: { bullets: bullets.length, quantifiedPercent, actionVerbPercent, words, keywordPercent },
  };
}

/** Inserts the pdfLaTeX unicode mapping before \begin{document}. Returns null if not applicable. */
export function unicodeMappingPatch(latex: string): { at: number; insert: string } | null {
  const at = latex.indexOf('\\begin{document}');
  if (at === -1 || /\\pdfgentounicode\s*=\s*1/.test(latex.slice(0, at))) return null;
  const hasGlyph = /\\input\{glyphtounicode\}/.test(latex.slice(0, at));
  return { at, insert: `${hasGlyph ? '' : '\\input{glyphtounicode}\n'}\\pdfgentounicode=1\n\n` };
}
