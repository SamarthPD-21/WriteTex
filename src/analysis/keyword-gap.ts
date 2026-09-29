/**
 * Keyword Gap Analysis Engine for WriteTex
 * Analyzes Job Descriptions vs. Resume content to highlight matched and missing skills.
 */

export interface KeywordGapResult {
  matchedKeywords: string[];
  missingKeywords: string[];
  matchPercentage: number;
  totalJdKeywords: number;
  suggestedPrompt: string;
}

// Curated dictionary of high-signal skills, technologies, methodologies, and competencies
const KNOWN_TECH_KEYWORDS = new Set([
  // Programming Languages
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'golang', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'sql', 'r', 'bash', 'shell', 'html', 'css',
  
  // Frontend
  'react', 'next.js', 'vue', 'angular', 'svelte', 'redux', 'tailwind', 'webpack',
  'vite', 'graphql', 'rest api', 'ui/ux', 'responsive design', 'webgl', 'three.js',
  
  // Backend & APIs
  'node.js', 'express', 'django', 'fastapi', 'flask', 'spring boot', 'rails',
  'microservices', 'distributed systems', 'grpc', 'kafka', 'rabbitmq', 'websocket',
  'event-driven', 'pub/sub',
  
  // Cloud & DevOps
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'github actions',
  'linux', 'serverless', 'lambda', 'sre', 'ansible', 'helm', 'prometheus', 'grafana',
  
  // Databases & Storage
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
  'snowflake', 'cassandra', 'sqlite', 'neo4j', 'vector database', 'pinecone', 'milvus',
  
  // AI, Machine Learning & Data
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'llm', 'llms',
  'generative ai', 'nlp', 'computer vision', 'rag', 'langchain', 'scikit-learn',
  'pandas', 'numpy', 'spark', 'hadoop', 'data pipelines', 'etl', 'fine-tuning',
  
  // Engineering Practices & Methodologies
  'system design', 'scalability', 'high availability', 'low latency', 'concurrency',
  'multithreading', 'unit testing', 'tdd', 'agile', 'scrum', 'code review',
  'object-oriented design', 'solid principles', 'design patterns', 'security',
  'penetration testing', 'oauth', 'jwt', 'cross-functional leadership', 'mentorship'
]);

/**
 * Alternate spellings that should count as the same skill. Keys are the canonical
 * names reported to the user.
 */
const KEYWORD_ALIASES: Record<string, string[]> = {
  go: ['golang'],
  javascript: ['js', 'es6'],
  'node.js': ['nodejs', 'node'],
  'next.js': ['nextjs'],
  react: ['react.js', 'reactjs'],
  vue: ['vue.js', 'vuejs'],
  angular: ['angularjs'],
  'three.js': ['threejs'],
  express: ['express.js', 'expressjs'],
  postgresql: ['postgres', 'psql'],
  mongodb: ['mongo'],
  kubernetes: ['k8s'],
  aws: ['amazon web services'],
  gcp: ['google cloud', 'google cloud platform'],
  azure: ['microsoft azure'],
  'ci/cd': ['ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
  'rest api': ['rest apis', 'restful', 'restful api', 'restful apis'],
  graphql: ['graph ql'],
  'machine learning': ['ml'],
  'deep learning': ['dl'],
  llm: ['llms', 'large language model', 'large language models'],
  'generative ai': ['genai', 'gen ai'],
  nlp: ['natural language processing'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  microservices: ['microservice', 'micro-services'],
  'distributed systems': ['distributed system', 'distributed computing'],
  'data pipelines': ['data pipeline'],
  'unit testing': ['unit tests', 'unit test'],
  tdd: ['test-driven development', 'test driven development'],
  'object-oriented design': ['object oriented design', 'oop', 'object-oriented programming'],
  'vector database': ['vector databases', 'vector db'],
  'fine-tuning': ['fine tuning', 'finetuning'],
  'c#': ['csharp'],
  'c++': ['cpp'],
  terraform: ['iac', 'infrastructure as code'],
  spark: ['pyspark', 'apache spark'],
  kafka: ['apache kafka'],
  multithreading: ['multi-threading', 'multithreaded'],
  'github actions': ['gh actions'],
  'pub/sub': ['pubsub'],
  websocket: ['websockets'],
};

/**
 * Keywords that are ordinary English words (or letters) in lowercase. In a job
 * description they only count when written the way the technology is written.
 */
const CASE_SENSITIVE_PATTERNS: Record<string, RegExp> = {
  go: /\bGo(?![-\w])(?!\s+to\b)|\b[Gg]olang\b/,
  r: /(?<![\w&/-])R(?![\w&+/-])(?!\s*&)/,
  express: /\bExpress(?:\.?js)?\b/,
  swift: /\bSwift\b/,
  spark: /\b(?:Py)?Spark\b/,
  rails: /\bRails\b/,
  rust: /\bRust\b/,
  lambda: /\bLambda\b/,
  shell: /\bShell\b|\bshell script/,
  security: /\bsecurity\b/i,
  'rest api': /\bREST(?:ful)?\b/,
  sre: /\bSRE\b/,
  helm: /\bHelm\b/,
  rag: /\bRAG\b/,
};

// Uppercase tokens that are not skills
const ACRONYM_STOPWORDS = new Set([
  'A', 'AN', 'AND', 'ARE', 'AS', 'AT', 'BE', 'BY', 'DO', 'FOR', 'IF', 'IN', 'IS', 'IT', 'ITS', 'NO', 'NOT',
  'OF', 'ON', 'OR', 'OUR', 'SO', 'THE', 'TO', 'UP', 'US', 'USA', 'WE', 'YOU', 'ALL', 'NEW', 'OUT', 'WITH',
  'EEO', 'EEOC', 'PTO', 'HR', 'CEO', 'CTO', 'CFO', 'COO', 'VP', 'LLC', 'INC', 'LTD', 'CO', 'FAQ', 'ASAP',
  'FTE', 'DEI', 'ADA', 'GPA', 'BS', 'BA', 'MS', 'MA', 'MBA', 'PHD', 'AM', 'PM', 'EST', 'PST', 'CST', 'UTC',
  'ET', 'PT', 'OK', 'ID', 'TBD', 'NA', 'N/A', 'UK', 'EU', 'NYC', 'SF', 'LA', 'DC', 'USD', 'EUR', 'INR',
  'K', 'M', 'B', 'ABOUT', 'ROLE', 'WHAT', 'WHO', 'HOW', 'WHY', 'JOB', 'TEAM', 'NOTE', 'PLUS', 'BONUS',
  'REQUIRED', 'PREFERRED', 'MUST', 'NICE', 'HAVE', 'YOUR', 'WILL', 'CAN', 'MAY', 'KEY', 'TOP', 'IV',
  'II', 'III', 'VI', 'X', 'R&D', 'OTE', 'RSU', 'RSUS', 'ESPP',
]);

interface KeywordSpec {
  canonical: string;
  variants: string[];
  pattern?: RegExp;
  globalPattern?: RegExp;
}

const KEYWORD_SPECS: KeywordSpec[] = (() => {
  const aliasTargets = new Set(Object.values(KEYWORD_ALIASES).flat());
  const specs: KeywordSpec[] = [];
  for (const keyword of KNOWN_TECH_KEYWORDS) {
    // Spellings folded into another canonical keyword (e.g. "postgres") are not separate skills
    if (aliasTargets.has(keyword)) continue;
    specs.push({
      canonical: keyword,
      variants: [keyword, ...(KEYWORD_ALIASES[keyword] || [])],
      pattern: CASE_SENSITIVE_PATTERNS[keyword],
      globalPattern: CASE_SENSITIVE_PATTERNS[keyword]
        ? new RegExp(CASE_SENSITIVE_PATTERNS[keyword].source, CASE_SENSITIVE_PATTERNS[keyword].flags + 'g')
        : undefined,
    });
  }
  return specs;
})();

/**
 * Strips LaTeX syntax and markup to obtain pure text tokens.
 */
export function stripLatexMarkup(latex: string): string {
  return stripLatexMarkupKeepCase(latex).toLowerCase();
}

function stripLatexMarkupKeepCase(latex: string): string {
  if (!latex) return '';
  return latex
    // Remove comments
    .replace(/(^|[^\\])%[^\n]*/g, '$1 ')
    // Keep link text, drop the URL: \href{url}{text} -> text
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, ' $1 ')
    // Remove command names but keep arguments: \command{arg} -> arg
    .replace(/\\(?:textbf|textit|emph|underline|section|subsection|resumeItem|resumeSubheading)\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, ' $1 ')
    // Remove remaining backslash commands: \resumeItemListStart -> ''
    .replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?/g, ' ')
    // Replace escaped characters
    .replace(/\\([&%$#_{}])/g, '$1')
    // Remove leftover brackets/braces
    .replace(/[{}[\]]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Helper to match keyword with punctuation boundaries
 */
function keywordMatchesText(keyword: string, text: string): boolean {
  return countKeyword(keyword, text) > 0;
}

// Analysis reruns on every keystroke in the job description box, so compile each pattern once
const keywordRegexCache = new Map<string, RegExp>();

function keywordRegex(keyword: string): RegExp {
  let regex = keywordRegexCache.get(keyword);
  if (!regex) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Punctuation like .,;:!?()[]{} should be treated as boundaries
    regex = new RegExp(`(?<![a-z0-9_#+.])${escaped}(?![a-z0-9_#+]|\\.[a-z])`, 'gi');
    keywordRegexCache.set(keyword, regex);
  }
  regex.lastIndex = 0;
  return regex;
}

function countKeyword(keyword: string, text: string): number {
  return (text.match(keywordRegex(keyword)) || []).length;
}

/** How many times a skill is mentioned; case-sensitive patterns apply to ambiguous words. */
function countSpec(spec: KeywordSpec, text: string): number {
  if (spec.pattern) {
    const global = spec.globalPattern!;
    global.lastIndex = 0;
    const aliasHits = spec.variants.slice(1).reduce((n, v) => n + countKeyword(v, text), 0);
    return (text.match(global) || []).length + aliasHits;
  }
  return spec.variants.reduce((n, v) => n + countKeyword(v, text), 0);
}

function extractAcronyms(jdText: string, known: Set<string>): Map<string, number> {
  const found = new Map<string, number>();
  for (const line of jdText.split('\n')) {
    const letters = line.replace(/[^A-Za-z]/g, '');
    // Skip ALL-CAPS headings such as "WHAT YOU'LL DO"
    if (letters.length > 8 && letters === letters.toUpperCase()) continue;

    for (const match of line.matchAll(/\b[A-Z][A-Z0-9]{1,5}(?:\/[A-Z]{2,6})*\b/g)) {
      const raw = match[0];
      if (ACRONYM_STOPWORDS.has(raw) || /^\d/.test(raw)) continue;
      const term = raw.toLowerCase();
      if (known.has(term)) continue;
      found.set(term, (found.get(term) || 0) + 1);
    }
  }
  return found;
}

/** Relative importance of each JD keyword: frequency, boosted on "required" lines. */
function scoreJdKeywords(jdText: string): Map<string, number> {
  const scores = new Map<string, number>();
  const lines = jdText.split('\n');

  const lineWeight = (line: string) => {
    if (/nice[- ]to[- ]have|bonus|\bplus\b|preferred|familiarity|exposure to/i.test(line)) return 0.5;
    if (/required|requirements|must|minimum|qualifications|proficien|strong|expert|\d\+?\s*years/i.test(line)) return 1.5;
    return 1;
  };

  for (const line of lines) {
    const weight = lineWeight(line);
    for (const spec of KEYWORD_SPECS) {
      const count = countSpec(spec, line);
      if (count > 0) scores.set(spec.canonical, (scores.get(spec.canonical) || 0) + count * weight);
    }
  }

  const known = new Set(KEYWORD_SPECS.flatMap((s) => s.variants));
  for (const [term, count] of extractAcronyms(jdText, known)) {
    if (!scores.has(term)) scores.set(term, count * 0.75);
  }
  return scores;
}

/**
 * Extracts candidate keywords from raw Job Description text.
 */
export function extractKeywordsFromJD(jdText: string): string[] {
  if (!jdText || jdText.trim().length === 0) return [];
  return Array.from(scoreJdKeywords(jdText).keys()).sort((a, b) => a.localeCompare(b));
}

/**
 * Compares Job Description keywords with current Resume text/LaTeX.
 * Missing keywords are ordered by how prominent they are in the job description.
 */
export function analyzeKeywordGap(
  jdText: string,
  resumeContent: string,
  targetRole?: string
): KeywordGapResult {
  const jdScores = jdText && jdText.trim() ? scoreJdKeywords(jdText) : new Map<string, number>();
  const jdKeywords = Array.from(jdScores.keys()).sort((a, b) => a.localeCompare(b));
  if (jdKeywords.length === 0) {
    return {
      matchedKeywords: [],
      missingKeywords: [],
      matchPercentage: 100,
      totalJdKeywords: 0,
      suggestedPrompt: '',
    };
  }

  const resumeText = stripLatexMarkupKeepCase(resumeContent);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jdKeywords) {
    const spec = KEYWORD_SPECS.find((s) => s.canonical === kw);
    // Resumes are terse and less ambiguous than JDs, so lowercase spellings count too
    const present = spec
      ? countSpec(spec, resumeText) > 0 || spec.variants.some((v) => keywordMatchesText(v, resumeText))
      : keywordMatchesText(kw, resumeText);
    (present ? matched : missing).push(kw);
  }

  missing.sort((a, b) => (jdScores.get(b) || 0) - (jdScores.get(a) || 0) || a.localeCompare(b));

  const matchPercentage = Math.round((matched.length / jdKeywords.length) * 100);

  const topMissing = missing.slice(0, 6);
  let suggestedPrompt = '';
  if (topMissing.length > 0) {
    const roleClause = targetRole ? ` for ${targetRole}` : '';
    suggestedPrompt = `Tailor my resume${roleClause} by naturally weaving in these missing job-description keywords where my existing experience genuinely supports them: ${topMissing.join(', ')}. Do not claim tools or skills I have not used — skip any that don't fit. Keep bullets impact-focused (Google XYZ) with at most 1-2 technologies per bullet.`;
  }

  return {
    matchedKeywords: matched,
    missingKeywords: missing,
    matchPercentage,
    totalJdKeywords: jdKeywords.length,
    suggestedPrompt,
  };
}
