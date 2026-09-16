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
 * Strips LaTeX syntax and markup to obtain pure text tokens.
 */
export function stripLatexMarkup(latex: string): string {
  if (!latex) return '';
  return latex
    // Remove comments
    .replace(/%[^\n]*/g, ' ')
    // Remove command names but keep arguments: \command{arg} -> arg
    .replace(/\\(?:textbf|textit|emph|underline|section|subsection|resumeItem|resumeSubheading|href)\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, ' $1 ')
    // Remove remaining backslash commands: \resumeItemListStart -> ''
    .replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?/g, ' ')
    // Replace escaped characters
    .replace(/\\([&%$#_{}])/g, '$1')
    // Remove leftover brackets/braces
    .replace(/[{}[\]]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Helper to match keyword with punctuation boundaries
 */
function keywordMatchesText(keyword: string, text: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Punctuation like .,;:!?()[]{} should be treated as boundaries
  const regex = new RegExp(`(?:^|[^a-z0-9_#+])${escaped}(?:$|[^a-z0-9_#+])`, 'i');
  return regex.test(text);
}

/**
 * Extracts candidate keywords from raw Job Description text.
 */
export function extractKeywordsFromJD(jdText: string): string[] {
  if (!jdText || jdText.trim().length === 0) return [];

  const lowerJd = jdText.toLowerCase();
  const extracted = new Set<string>();

  // 1. Check known high-signal technical keywords
  for (const keyword of KNOWN_TECH_KEYWORDS) {
    if (keywordMatchesText(keyword, lowerJd)) {
      extracted.add(keyword);
    }
  }

  // 2. Extract capitalized technical terms / acronyms (e.g. AWS, CI/CD, SDK, ETL, API)
  const acronymRegex = /\b[A-Z]{2,6}(?:\/[A-Z]{2,6})*\b/g;
  let match: RegExpExecArray | null;
  while ((match = acronymRegex.exec(jdText)) !== null) {
    const term = match[0].toLowerCase();
    if (term.length >= 2 && !['AND', 'FOR', 'THE', 'YOU', 'ARE', 'OUR', 'NOT', 'WITH', 'NEW', 'ALL', 'OUT'].includes(match[0])) {
      extracted.add(term);
    }
  }

  return Array.from(extracted).sort((a, b) => a.localeCompare(b));
}

/**
 * Compares Job Description keywords with current Resume text/LaTeX.
 */
export function analyzeKeywordGap(
  jdText: string,
  resumeContent: string,
  targetRole?: string
): KeywordGapResult {
  const jdKeywords = extractKeywordsFromJD(jdText);
  if (jdKeywords.length === 0) {
    return {
      matchedKeywords: [],
      missingKeywords: [],
      matchPercentage: 100,
      totalJdKeywords: 0,
      suggestedPrompt: '',
    };
  }

  const cleanResume = stripLatexMarkup(resumeContent);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jdKeywords) {
    if (keywordMatchesText(kw, cleanResume)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const matchPercentage = Math.round((matched.length / jdKeywords.length) * 100);

  const topMissing = missing.slice(0, 6);
  let suggestedPrompt = '';
  if (topMissing.length > 0) {
    const roleClause = targetRole ? ` for ${targetRole}` : '';
    suggestedPrompt = `Naturally weave these missing target job competencies into my resume achievements${roleClause}: ${topMissing.join(', ')}. Use quantifiable metrics and Google XYZ formula.`;
  }

  return {
    matchedKeywords: matched,
    missingKeywords: missing,
    matchPercentage,
    totalJdKeywords: jdKeywords.length,
    suggestedPrompt,
  };
}
