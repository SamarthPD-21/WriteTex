import { GitHubRepo } from './types';

interface RoleCriteria {
  keywords: string[];
  languages: string[];
  reasonTemplate: string;
}

const ROLE_CRITERIA_MAP: Record<string, RoleCriteria> = {
  role_aiml: {
    keywords: [
      'pytorch', 'tensorflow', 'jax', 'transformers', 'llm', 'deep-learning',
      'machine-learning', 'cuda', 'rag', 'diffusion', 'computer-vision', 'nlp',
      'huggingface', 'model', 'neural', 'training', 'dataset', 'inference', 'vision', 'agent'
    ],
    languages: ['Python', 'C++', 'CUDA', 'Julia'],
    reasonTemplate: 'Exhibits deep learning architectures, model training, and AI/ML pipeline engineering.',
  },
  role_swe: {
    keywords: [
      'distributed-systems', 'microservices', 'api', 'concurrency', 'database',
      'cache', 'redis', 'grpc', 'kafka', 'backend', 'performance', 'scalable',
      'engine', 'compiler', 'cli', 'network', 'protocol', 'systems', 'storage'
    ],
    languages: ['Go', 'Rust', 'C++', 'Java', 'Python', 'TypeScript', 'C'],
    reasonTemplate: 'Highlights distributed systems engineering, backend scalability, and high-performance code.',
  },
  role_fullstack: {
    keywords: [
      'react', 'nextjs', 'next.js', 'vue', 'nodejs', 'node', 'typescript',
      'graphql', 'tailwind', 'postgres', 'prisma', 'frontend', 'web',
      'fullstack', 'saas', 'auth', 'rest', 'api', 'app', 'ui'
    ],
    languages: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'Python', 'Go'],
    reasonTemplate: 'Demonstrates end-to-end fullstack architecture, responsive frontend, and modern web APIs.',
  },
  role_devops: {
    keywords: [
      'kubernetes', 'k8s', 'docker', 'terraform', 'ansible', 'ci-cd', 'actions',
      'helm', 'cloud', 'aws', 'gcp', 'monitoring', 'prometheus', 'grafana', 'infra', 'sre'
    ],
    languages: ['HCL', 'Go', 'Shell', 'Python', 'YAML'],
    reasonTemplate: 'Exemplifies automated cloud infrastructure, container orchestration, and CI/CD pipelines.',
  },
  role_data: {
    keywords: [
      'pandas', 'numpy', 'scikit-learn', 'sql', 'spark', 'analysis', 'visualization',
      'jupyter', 'tableau', 'statistics', 'pipeline', 'etl', 'warehouse', 'modeling', 'data'
    ],
    languages: ['Python', 'R', 'SQL', 'Jupyter Notebook'],
    reasonTemplate: 'Highlights predictive statistical modeling, data visualization, and automated ETL pipelines.',
  },
  role_quant: {
    keywords: [
      'trading', 'arbitrage', 'quant', 'finance', 'backtest', 'stochastic',
      'options', 'portfolio', 'low-latency', 'orderbook', 'market', 'algorithm'
    ],
    languages: ['C++', 'Python', 'Rust'],
    reasonTemplate: 'Demonstrates mathematical modeling, algorithmic execution, and financial analysis.',
  },
  role_security: {
    keywords: [
      'security', 'crypto', 'cryptography', 'exploit', 'vulnerability',
      'penetration', 'auth', 'firewall', 'zero-trust', 'cve', 'malware', 'scanner'
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
      'reproducibility', 'thesis', 'proof', 'experiment'
    ],
    languages: ['Python', 'Julia', 'C++', 'R', 'TeX'],
    reasonTemplate: 'Demonstrates empirical rigor, experimental benchmarking, and algorithmic novelty.',
  },
};

const DEFAULT_CRITERIA: RoleCriteria = {
  keywords: ['api', 'app', 'engine', 'tool', 'library', 'framework', 'service', 'system'],
  languages: ['TypeScript', 'Python', 'Go', 'Rust', 'C++', 'JavaScript'],
  reasonTemplate: 'Demonstrates technical craftsmanship, modular architecture, and open-source contribution.',
};

/**
 * Evaluates and ranks repositories against the candidate's target career role.
 */
export function rankRepositoriesByRole(
  repos: GitHubRepo[],
  targetRoleKey?: string
): GitHubRepo[] {
  const criteria =
    (targetRoleKey && ROLE_CRITERIA_MAP[targetRoleKey]) ||
    DEFAULT_CRITERIA;

  const scoredRepos = repos.map((repo) => {
    let score = 0;
    const nameLower = repo.name.toLowerCase();
    const descLower = (repo.description || '').toLowerCase();
    const topicsLower = (repo.topics || []).map((t) => t.toLowerCase());

    // Filter out trivial dotfile/config repos
    if (
      nameLower.includes('dotfiles') ||
      nameLower === repo.name.toLowerCase() && nameLower.startsWith('.') ||
      nameLower.includes('config') && repo.stars === 0
    ) {
      score -= 80;
    }

    // Fork penalty (unless high engagement)
    if (repo.isFork) {
      score -= repo.stars > 10 ? 10 : 35;
    }

    // Primary language alignment
    if (repo.language && criteria.languages.includes(repo.language)) {
      score += 28;
    }

    // Keyword matching in description & topics
    let keywordMatches = 0;
    for (const kw of criteria.keywords) {
      if (descLower.includes(kw) || topicsLower.includes(kw) || nameLower.includes(kw)) {
        keywordMatches++;
      }
    }
    score += Math.min(keywordMatches * 15, 60);

    // Stars and community validation
    if (repo.stars > 0) {
      score += Math.round(Math.log10(repo.stars + 1) * 14);
    }
    if (repo.forks > 0) {
      score += Math.round(Math.log10(repo.forks + 1) * 6);
    }

    // Recency (within last 180 days)
    if (repo.updatedAt) {
      const daysAgo = (Date.now() - new Date(repo.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo < 180) {
        score += 15;
      } else if (daysAgo < 365) {
        score += 8;
      }
    }

    // Description quality
    if (repo.description && repo.description.length > 25) {
      score += 10;
    }

    // Determine role match reason
    let matchReason = criteria.reasonTemplate;
    if (keywordMatches > 0 && repo.language) {
      matchReason = `Built with ${repo.language}. ${criteria.reasonTemplate}`;
    }

    return {
      ...repo,
      relevanceScore: Math.max(0, score),
      roleMatchReason: matchReason,
      selected: true, // Default selected
    };
  });

  // Sort descending by relevance score, with tie-breaking on stars
  return scoredRepos.sort((a, b) => {
    if ((b.relevanceScore || 0) !== (a.relevanceScore || 0)) {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }
    return b.stars - a.stars;
  });
}
