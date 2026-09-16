import { GitHubRepo } from './types';

export interface RoleCriteria {
  keywords: string[];
  languages: string[];
  jdKeywords?: string[];
  reasonTemplate: string;
}

export const ROLE_CRITERIA_MAP: Record<string, RoleCriteria> = {
  role_aiml: {
    keywords: [
      'pytorch', 'tensorflow', 'jax', 'transformers', 'llm', 'deep-learning',
      'machine-learning', 'cuda', 'rag', 'diffusion', 'computer-vision', 'nlp',
      'huggingface', 'model', 'neural', 'training', 'dataset', 'inference', 'vision', 'agent',
      'langchain', 'llama', 'gemini', 'openai', 'fine-tuning'
    ],
    languages: ['Python', 'C++', 'CUDA', 'Julia'],
    reasonTemplate: 'Exhibits deep learning architectures, model training, and AI/ML pipeline engineering.',
  },
  role_swe: {
    keywords: [
      'distributed-systems', 'microservices', 'api', 'concurrency', 'database',
      'cache', 'redis', 'grpc', 'kafka', 'backend', 'performance', 'scalable',
      'engine', 'compiler', 'cli', 'network', 'protocol', 'systems', 'storage',
      'multithread', 'raft', 'consensus', 'ast', 'parser', 'low-latency', 'socket'
    ],
    languages: ['Go', 'Rust', 'C++', 'Java', 'Python', 'TypeScript', 'C'],
    reasonTemplate: 'Highlights distributed systems engineering, backend scalability, and high-performance code.',
  },
  role_fullstack: {
    keywords: [
      'react', 'nextjs', 'next.js', 'vue', 'nodejs', 'node', 'typescript',
      'graphql', 'tailwind', 'postgres', 'prisma', 'frontend', 'web',
      'fullstack', 'saas', 'auth', 'rest', 'api', 'app', 'ui', 'express', 'redis', 'bullmq'
    ],
    languages: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'Python', 'Go'],
    reasonTemplate: 'Demonstrates end-to-end fullstack architecture, responsive frontend, and modern web APIs.',
  },
  role_devops: {
    keywords: [
      'kubernetes', 'k8s', 'docker', 'terraform', 'ansible', 'ci-cd', 'actions',
      'helm', 'cloud', 'aws', 'gcp', 'monitoring', 'prometheus', 'grafana', 'infra', 'sre', 'linux'
    ],
    languages: ['HCL', 'Go', 'Shell', 'Python', 'YAML'],
    reasonTemplate: 'Exemplifies automated cloud infrastructure, container orchestration, and CI/CD pipelines.',
  },
  role_data: {
    keywords: [
      'pandas', 'numpy', 'scikit-learn', 'sql', 'spark', 'analysis', 'visualization',
      'jupyter', 'tableau', 'statistics', 'pipeline', 'etl', 'warehouse', 'modeling', 'data', 'airflow'
    ],
    languages: ['Python', 'R', 'SQL', 'Jupyter Notebook'],
    reasonTemplate: 'Highlights predictive statistical modeling, data visualization, and automated ETL pipelines.',
  },
  role_quant: {
    keywords: [
      'trading', 'arbitrage', 'quant', 'finance', 'backtest', 'stochastic',
      'options', 'portfolio', 'low-latency', 'orderbook', 'market', 'algorithm', 'risk'
    ],
    languages: ['C++', 'Python', 'Rust'],
    reasonTemplate: 'Demonstrates mathematical modeling, algorithmic execution, and financial analysis.',
  },
  role_security: {
    keywords: [
      'security', 'crypto', 'cryptography', 'exploit', 'vulnerability',
      'penetration', 'auth', 'firewall', 'zero-trust', 'cve', 'malware', 'scanner', 'reverse-engineering'
    ],
    languages: ['C', 'C++', 'Rust', 'Python', 'Go'],
    reasonTemplate: 'Demonstrates threat modeling, secure system design, and vulnerability remediation.',
  },
  role_pm: {
    keywords: [
      'product', 'dashboard', 'analytics', 'user', 'platform', 'app',
      'growth', 'roadmap', 'collaboration', 'metrics', 'tool'
    ],
    languages: ['TypeScript', 'JavaScript', 'Python'],
    reasonTemplate: 'Exemplifies product thinking, user experience execution, and high feature engagement.',
  },
  role_academic: {
    keywords: [
      'research', 'paper', 'simulation', 'algorithm', 'benchmark', 'dataset',
      'reproducibility', 'thesis', 'proof', 'experiment', 'latex'
    ],
    languages: ['Python', 'Julia', 'C++', 'R', 'TeX'],
    reasonTemplate: 'Demonstrates empirical rigor, experimental benchmarking, and algorithmic novelty.',
  },
};

export const DEFAULT_CRITERIA: RoleCriteria = {
  keywords: ['api', 'app', 'engine', 'tool', 'library', 'framework', 'service', 'system', 'database', 'pipeline'],
  languages: ['TypeScript', 'Python', 'Go', 'Rust', 'C++', 'Java', 'JavaScript'],
  reasonTemplate: 'Demonstrates technical craftsmanship, modular architecture, and open-source contribution.',
};

/**
 * Resolves natural role titles and optional Job Descriptions into rich RoleCriteria.
 */
export function resolveRoleCriteria(
  targetRoleOrKey?: string,
  jobDescription?: string
): RoleCriteria {
  let baseCriteria: RoleCriteria = DEFAULT_CRITERIA;

  if (targetRoleOrKey) {
    const clean = targetRoleOrKey.toLowerCase().trim();

    // Check direct key first
    if (ROLE_CRITERIA_MAP[targetRoleOrKey]) {
      baseCriteria = ROLE_CRITERIA_MAP[targetRoleOrKey];
    } else if (clean.includes('ai') || clean.includes('ml') || clean.includes('machine learning') || clean.includes('deep learning') || clean.includes('nlp') || clean.includes('vision') || clean.includes('llm')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_aiml;
    } else if (clean.includes('full stack') || clean.includes('fullstack') || clean.includes('frontend') || clean.includes('web') || clean.includes('react')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_fullstack;
    } else if (clean.includes('devops') || clean.includes('cloud') || clean.includes('sre') || clean.includes('infra') || clean.includes('platform')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_devops;
    } else if (clean.includes('data') && (clean.includes('scientist') || clean.includes('engineer') || clean.includes('analyst'))) {
      baseCriteria = ROLE_CRITERIA_MAP.role_data;
    } else if (clean.includes('quant') || clean.includes('trading') || clean.includes('finance')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_quant;
    } else if (clean.includes('security') || clean.includes('cyber')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_security;
    } else if (clean.includes('software') || clean.includes('swe') || clean.includes('backend') || clean.includes('systems') || clean.includes('core')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_swe;
    } else if (clean.includes('product') || clean.includes('pm')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_pm;
    } else if (clean.includes('research') || clean.includes('academic')) {
      baseCriteria = ROLE_CRITERIA_MAP.role_academic;
    }
  }

  // If a job description is provided, dynamically inject JD skills
  if (jobDescription && jobDescription.trim().length > 0) {
    const jdLower = jobDescription.toLowerCase();
    const commonTechs = [
      'typescript', 'javascript', 'python', 'java', 'golang', 'go', 'rust', 'c++', 'c#',
      'react', 'nextjs', 'next.js', 'vue', 'angular', 'node', 'express', 'nestjs', 'spring',
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'redis', 'postgres', 'postgresql',
      'mongodb', 'graphql', 'rest', 'grpc', 'kafka', 'rabbitmq', 'bullmq', 'prisma', 'ci/cd',
      'pytorch', 'tensorflow', 'langchain', 'openai', 'llm', 'rag', 'socket.io', 'websocket'
    ];

    const jdKeywords = new Set<string>(baseCriteria.keywords);
    const jdLangs = new Set<string>(baseCriteria.languages);
    const matchedJdTechs: string[] = [];

    for (const tech of commonTechs) {
      if (jdLower.includes(tech)) {
        jdKeywords.add(tech);
        matchedJdTechs.push(tech);
        const capitalized = tech.charAt(0).toUpperCase() + tech.slice(1);
        jdLangs.add(capitalized);
      }
    }

    return {
      keywords: Array.from(jdKeywords),
      languages: Array.from(jdLangs),
      jdKeywords: matchedJdTechs,
      reasonTemplate: baseCriteria.reasonTemplate,
    };
  }

  return baseCriteria;
}

/**
 * Evaluates and ranks repositories against the candidate's target career role.
 * Considers engineering complexity, verified tech stacks, language alignment,
 * and down-ranks trivial coursework or empty forks.
 */
export function rankRepositoriesByRole(
  repos: GitHubRepo[],
  targetRoleKey?: string,
  targetJobDescription?: string
): GitHubRepo[] {
  const criteria = resolveRoleCriteria(targetRoleKey, targetJobDescription);

  const scoredRepos = repos.map((repo) => {
    let score = 0;
    const nameLower = repo.name.toLowerCase();
    const descLower = (repo.description || '').toLowerCase();
    const topicsLower = (repo.topics || []).map((t: string) => t.toLowerCase());
    const verifiedStackLower = (repo.verifiedTechStack || []).map((t: string) => t.toLowerCase());
    const summaryLower = (repo.readmeSummary || '').toLowerCase();

    // 1. Noise Penalties: Trivial homework, coursework assignments, or dotfiles
    const isCourseworkOrNoise =
      nameLower.includes('dotfile') ||
      nameLower.startsWith('.') ||
      nameLower.includes('batch-') ||
      nameLower.includes('trimester-') ||
      nameLower.includes('homework') ||
      nameLower.includes('assignment') ||
      nameLower.includes('coursework') ||
      nameLower.includes('tutorial') ||
      nameLower.includes('practice') ||
      nameLower.includes('freecodecamp') ||
      nameLower.includes('hacktoberfest') ||
      nameLower.includes('notes') ||
      nameLower.includes('config') ||
      nameLower === 'portfolio';

    if (isCourseworkOrNoise) {
      score -= 75;
    }

    // Fork penalty (unless community has given it real engagement)
    if (repo.isFork) {
      score -= repo.stars > 10 ? 15 : 45;
    }

    // Penalty for empty/unrecognized repos with 0 stars
    if ((!repo.language || repo.language === 'Plain Text' || repo.language === 'HTML') && repo.stars === 0 && !repo.description) {
      score -= 30;
    }

    // 2. High-Signal Engineering Complexity Boost
    // Substantive systems engineering concepts in name or verified description
    const complexKeywords = [
      'compiler', 'parser', 'ast', 'database', 'engine', 'distributed',
      'cache', 'consensus', 'raft', 'concurrency', 'multithread', 'websocket',
      'proxy', 'stream', 'broker', 'queue', 'pipeline', 'agent', 'model',
      'transformer', 'framework', 'protocol', 'storage', 'benchmark'
    ];

    let complexityMatches = 0;
    for (const ck of complexKeywords) {
      if (
        nameLower.includes(ck) ||
        descLower.includes(ck) ||
        summaryLower.includes(ck) ||
        topicsLower.includes(ck)
      ) {
        complexityMatches++;
      }
    }
    score += Math.min(complexityMatches * 15, 45);

    // 3. Primary Language & Verified Stack Alignment
    if (repo.language && criteria.languages.some((l) => l.toLowerCase() === repo.language.toLowerCase())) {
      score += 25;
    }

    // Verified dependencies match
    for (const stackItem of verifiedStackLower) {
      if (criteria.keywords.some((k) => stackItem.includes(k))) {
        score += 12;
      }
    }

    // 4. Keyword matching in description, topics, verified stack, and README summary
    let keywordMatches = 0;
    for (const kw of criteria.keywords) {
      if (
        descLower.includes(kw) ||
        topicsLower.includes(kw) ||
        nameLower.includes(kw) ||
        verifiedStackLower.includes(kw) ||
        summaryLower.includes(kw)
      ) {
        keywordMatches++;
      }
    }
    score += Math.min(keywordMatches * 14, 70);

    // 4B. Targeted Job Description Technology Match Boost
    if (criteria.jdKeywords && criteria.jdKeywords.length > 0) {
      let jdMatches = 0;
      for (const kw of criteria.jdKeywords) {
        if (
          descLower.includes(kw) ||
          topicsLower.includes(kw) ||
          nameLower.includes(kw) ||
          verifiedStackLower.includes(kw) ||
          summaryLower.includes(kw)
        ) {
          jdMatches++;
        }
      }
      score += jdMatches * 25;
    }

    // 5. Stars and community validation
    if (repo.stars > 0) {
      score += Math.round(Math.log10(repo.stars + 1) * 16);
    }
    if (repo.forks > 0) {
      score += Math.round(Math.log10(repo.forks + 1) * 8);
    }

    // 6. Substantive Description / Verified README Quality
    if (repo.readmeSummary && repo.readmeSummary.length > 50) {
      score += 18;
    } else if (repo.description && repo.description.length > 25) {
      score += 10;
    }

    // 7. Recency (within last 180 days gets fresh momentum, but doesn't overpower architecture)
    if (repo.updatedAt) {
      const daysAgo = (Date.now() - new Date(repo.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo < 180) {
        score += 10;
      } else if (daysAgo < 365) {
        score += 5;
      }
    }

    // Determine role match reason
    let matchReason = criteria.reasonTemplate;
    const effectiveStack = (repo.verifiedTechStack && repo.verifiedTechStack.length > 0)
      ? repo.verifiedTechStack.slice(0, 3).join(', ')
      : repo.language;

    if (keywordMatches > 0 && effectiveStack) {
      matchReason = `Engineered with ${effectiveStack}. ${criteria.reasonTemplate}`;
    }

    return {
      ...repo,
      relevanceScore: Math.max(0, score),
      roleMatchReason: matchReason,
      selected: true,
    };
  });

  // Sort descending by relevance score, tie-breaking on stars, then recency
  return scoredRepos.sort((a, b) => {
    if ((b.relevanceScore || 0) !== (a.relevanceScore || 0)) {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }
    if (b.stars !== a.stars) {
      return b.stars - a.stars;
    }
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });
}
