import { parseGitHubUrl } from './url-parser';
import { rankRepositoriesByRole } from './ranker';
import { GitHubRepo, GitHubAnalysisResult } from './types';

// In-memory cache to prevent GitHub rate-limiting
const cache = new Map<string, { result: GitHubAnalysisResult; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface RawGitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
  topics?: string[];
  fork: boolean;
  default_branch?: string;
}

interface RawGitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  public_repos: number;
  html_url: string;
}

/**
 * Helper to fetch a raw file from raw.githubusercontent.com with a timeout to prevent hanging.
 */
async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.text();
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Enriches a repository with verified ground-truth dependencies and human-written README summary.
 */
export async function enrichRepoDetails(
  owner: string,
  repo: GitHubRepo
): Promise<GitHubRepo> {
  const branch = repo.defaultBranch || 'main';
  const detectedStack: Set<string> = new Set();
  const dependencies: Set<string> = new Set();
  let readmeSummary = repo.readmeSummary;

  if (repo.language && repo.language !== 'Plain Text') {
    detectedStack.add(repo.language);
  }

  // 1. Inspect package.json for Node / TypeScript / Frontend / Backend
  const packageJsonRaw = await fetchRawFile(owner, repo.name, branch, 'package.json');
  if (packageJsonRaw) {
    try {
      const pkg = JSON.parse(packageJsonRaw);
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const depKeys = Object.keys(allDeps).filter((d) => !d.startsWith('@types/'));

      for (const d of depKeys.slice(0, 8)) {
        dependencies.add(d);
      }

      // Map well-known dependencies to friendly display names
      const frameworkMap: Record<string, string> = {
        react: 'React',
        next: 'Next.js',
        vue: 'Vue',
        svelte: 'Svelte',
        express: 'Express',
        '@nestjs/core': 'NestJS',
        fastify: 'Fastify',
        tailwindcss: 'Tailwind CSS',
        prisma: 'Prisma ORM',
        '@prisma/client': 'Prisma',
        ioredis: 'Redis',
        redis: 'Redis',
        bullmq: 'BullMQ',
        mongodb: 'MongoDB',
        mongoose: 'Mongoose',
        socket: 'Socket.io',
        'socket.io': 'Socket.io',
        vitest: 'Vitest',
        jest: 'Jest',
        playwright: 'Playwright',
        openai: 'OpenAI API',
        '@google/genai': 'Gemini API',
        'pdf-lib': 'PDF-Lib',
        'pdfjs-dist': 'PDF.js',
      };

      for (const [depKey, label] of Object.entries(frameworkMap)) {
        if (allDeps[depKey]) {
          detectedStack.add(label);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 2. Inspect requirements.txt / pyproject.toml for Python
  if (repo.language?.toLowerCase().includes('python') || (!packageJsonRaw && repo.language === 'Plain Text')) {
    const reqsRaw = await fetchRawFile(owner, repo.name, branch, 'requirements.txt');
    if (reqsRaw) {
      const lines = reqsRaw.split('\n').map((l) => l.trim().split(/[=><~]/)[0].toLowerCase()).filter(Boolean);
      for (const line of lines.slice(0, 6)) {
        dependencies.add(line);
      }
      const pyMap: Record<string, string> = {
        torch: 'PyTorch',
        pytorch: 'PyTorch',
        tensorflow: 'TensorFlow',
        fastapi: 'FastAPI',
        flask: 'Flask',
        django: 'Django',
        pandas: 'Pandas',
        numpy: 'NumPy',
        langchain: 'LangChain',
        transformers: 'HuggingFace Transformers',
        scikit_learn: 'Scikit-Learn',
        celery: 'Celery',
        uvicorn: 'Uvicorn',
      };
      for (const [pkg, label] of Object.entries(pyMap)) {
        if (lines.some((l) => l.includes(pkg))) {
          detectedStack.add(label);
        }
      }
    }
  }

  // 3. Inspect pom.xml or build.gradle for Java
  if (repo.language?.toLowerCase().includes('java')) {
    const pomRaw = await fetchRawFile(owner, repo.name, branch, 'pom.xml');
    const gradleRaw = pomRaw ? null : await fetchRawFile(owner, repo.name, branch, 'build.gradle');
    const javaConfig = pomRaw || gradleRaw || '';
    if (javaConfig) {
      if (javaConfig.includes('spring-boot')) detectedStack.add('Spring Boot');
      if (javaConfig.includes('quarkus')) detectedStack.add('Quarkus');
      if (javaConfig.includes('micronaut')) detectedStack.add('Micronaut');
      if (javaConfig.includes('hibernate')) detectedStack.add('Hibernate');
      if (javaConfig.includes('kafka')) detectedStack.add('Kafka');
      if (javaConfig.includes('junit')) detectedStack.add('JUnit');
    }
  }

  // 4. Inspect go.mod for Go
  if (repo.language?.toLowerCase() === 'go') {
    const goModRaw = await fetchRawFile(owner, repo.name, branch, 'go.mod');
    if (goModRaw) {
      if (goModRaw.includes('gin-gonic')) detectedStack.add('Gin');
      if (goModRaw.includes('gofiber')) detectedStack.add('Fiber');
      if (goModRaw.includes('grpc')) detectedStack.add('gRPC');
      if (goModRaw.includes('redis')) detectedStack.add('Redis');
    }
  }

  // 5. Inspect Cargo.toml for Rust
  if (repo.language?.toLowerCase() === 'rust') {
    const cargoRaw = await fetchRawFile(owner, repo.name, branch, 'Cargo.toml');
    if (cargoRaw) {
      if (cargoRaw.includes('tokio')) detectedStack.add('Tokio');
      if (cargoRaw.includes('actix')) detectedStack.add('Actix-Web');
      if (cargoRaw.includes('axum')) detectedStack.add('Axum');
    }
  }

  // 6. Inspect README.md for project summary if description is missing or brief
  if (!repo.description || repo.description.length < 30 || !readmeSummary) {
    const readmeRaw = await fetchRawFile(owner, repo.name, branch, 'README.md');
    if (readmeRaw) {
      // Strip markdown image links, badges, HTML tags, and code blocks
      const clean = readmeRaw
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#+\s+/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 20 && !l.startsWith('|') && !l.startsWith('-') && !l.startsWith('*'))
        .slice(0, 2)
        .join(' ');

      if (clean && clean.length > 25) {
        readmeSummary = clean.slice(0, 280);
      }
    }
  }

  return {
    ...repo,
    verifiedTechStack: Array.from(detectedStack),
    manifestDependencies: Array.from(dependencies),
    readmeSummary: readmeSummary || repo.description || undefined,
  };
}

/**
 * Fetches and analyzes GitHub repositories for a given profile or repo link.
 * Scans the complete public portfolio and enriches candidate projects with verified ground truth.
 */
export async function analyzeGitHubProfile(
  inputUrl: string,
  targetRoleKey?: string,
  targetJobDescription?: string
): Promise<GitHubAnalysisResult> {
  const parsed = parseGitHubUrl(inputUrl);
  if (!parsed.isValid || !parsed.username) {
    throw new Error(
      'Invalid GitHub link. Please provide a valid profile or repository link (e.g., github.com/username or github.com/username/project).'
    );
  }

  const cacheKey = `${parsed.username.toLowerCase()}_${parsed.repoName || 'all'}_${targetRoleKey || ''}_${targetJobDescription ? targetJobDescription.slice(0, 30) : ''}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    // Re-rank cached repos if role or JD changed
    const reranked = rankRepositoriesByRole(cached.result.allProjects, targetRoleKey, targetJobDescription);
    return {
      ...cached.result,
      targetRole: targetRoleKey,
      targetJobDescription,
      topProjects: reranked.slice(0, 4),
      allProjects: reranked,
    };
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'WriteTex-Overleaf-Copilot',
  };

  try {
    if (parsed.isRepoUrl && parsed.repoName) {
      // 1. Single Repository Mode
      const repoRes = await fetch(
        `https://api.github.com/repos/${parsed.username}/${parsed.repoName}`,
        { headers }
      );

      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          throw new Error(`GitHub repository "${parsed.username}/${parsed.repoName}" was not found or is private.`);
        }
        if (repoRes.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub API error (Status ${repoRes.status}).`);
      }

      const rawRepo: RawGitHubRepo = await repoRes.json();
      let repo: GitHubRepo = {
        name: rawRepo.name,
        fullName: rawRepo.full_name,
        description: rawRepo.description || '',
        url: rawRepo.html_url,
        htmlUrl: rawRepo.html_url,
        language: rawRepo.language || 'Code',
        stars: rawRepo.stargazers_count,
        forks: rawRepo.forks_count,
        updatedAt: rawRepo.pushed_at || rawRepo.updated_at,
        topics: rawRepo.topics || [],
        isFork: rawRepo.fork,
        defaultBranch: rawRepo.default_branch || 'main',
        relevanceScore: 100,
        roleMatchReason: 'Directly featured user project.',
        selected: true,
      };

      // Enrich ground-truth dependencies for single repository
      repo = await enrichRepoDetails(parsed.username, repo);

      const result: GitHubAnalysisResult = {
        username: parsed.username,
        profileUrl: `https://github.com/${parsed.username}`,
        publicReposCount: 1,
        totalStars: repo.stars,
        totalForks: repo.forks,
        topLanguages: [{ language: repo.language, count: 1 }],
        allTopics: repo.topics,
        topProjects: [repo],
        allProjects: [repo],
        targetRole: targetRoleKey,
        targetJobDescription,
        analyzedAt: Date.now(),
      };

      cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // 2. Full User Profile Mode
    const userRes = await fetch(`https://api.github.com/users/${parsed.username}`, { headers });

    if (!userRes.ok) {
      if (userRes.status === 404) {
        throw new Error(`GitHub user "@${parsed.username}" was not found.`);
      }
      if (userRes.status === 403) {
        throw new Error('GitHub API rate limit reached. Please wait a few minutes or check link.');
      }
      throw new Error(`GitHub request failed (Status ${userRes.status}).`);
    }

    const rawUser: RawGitHubUser = await userRes.json();

    // Fetch page 1 (100 repos) and if public_repos > 100, fetch page 2 to ensure full portfolio coverage
    const repoFetches = [
      fetch(`https://api.github.com/users/${parsed.username}/repos?sort=pushed&per_page=100&page=1`, { headers }),
    ];

    if (rawUser.public_repos > 100) {
      repoFetches.push(
        fetch(`https://api.github.com/users/${parsed.username}/repos?sort=pushed&per_page=100&page=2`, { headers })
      );
    }

    const repoResponses = await Promise.all(repoFetches);
    const rawReposArrays = await Promise.all(
      repoResponses.filter((res) => res.ok).map((res) => res.json() as Promise<RawGitHubRepo[]>)
    );
    const rawRepos = rawReposArrays.flat();

    let mappedRepos: GitHubRepo[] = rawRepos.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      url: r.html_url,
      htmlUrl: r.html_url,
      language: r.language || 'Plain Text',
      stars: r.stargazers_count,
      forks: r.forks_count,
      updatedAt: r.pushed_at || r.updated_at,
      topics: r.topics || [],
      isFork: r.fork,
      defaultBranch: r.default_branch || 'main',
    }));

    // Extract aggregated languages and topics across the entire portfolio
    const langCounts: Record<string, number> = {};
    const topicsSet = new Set<string>();

    for (const r of mappedRepos) {
      if (r.language && r.language !== 'Plain Text') {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }
      for (const t of r.topics) {
        topicsSet.add(t);
      }
    }

    const topLanguages = Object.entries(langCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Initial pass: Rank by role and JD
    const initialRanked = rankRepositoriesByRole(mappedRepos, targetRoleKey, targetJobDescription);

    // Deep technical enrichment: Enrich top 8 candidates with verified manifest and README
    const topCandidates = initialRanked.slice(0, 8);
    const enrichedResults = await Promise.allSettled(
      topCandidates.map((repo) => enrichRepoDetails(parsed.username!, repo))
    );

    const enrichedMap = new Map<string, GitHubRepo>();
    for (const res of enrichedResults) {
      if (res.status === 'fulfilled') {
        enrichedMap.set(res.value.name, res.value);
      }
    }

    // Merge enriched ground-truth data back into mappedRepos
    mappedRepos = mappedRepos.map((r) => enrichedMap.get(r.name) || r);

    // Final accurate ranking with verified stacks
    const finalRanked = rankRepositoriesByRole(mappedRepos, targetRoleKey, targetJobDescription);
    const totalStars = mappedRepos.reduce((sum, r) => sum + (r.stars || 0), 0);
    const totalForks = mappedRepos.reduce((sum, r) => sum + (r.forks || 0), 0);

    const result: GitHubAnalysisResult = {
      username: rawUser.login,
      name: rawUser.name || undefined,
      bio: rawUser.bio || undefined,
      avatarUrl: rawUser.avatar_url,
      profileUrl: rawUser.html_url,
      publicReposCount: rawUser.public_repos,
      totalStars,
      totalForks,
      topLanguages,
      allTopics: Array.from(topicsSet),
      topProjects: finalRanked.slice(0, 4),
      allProjects: finalRanked,
      targetRole: targetRoleKey,
      targetJobDescription,
      analyzedAt: Date.now(),
    };

    cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to analyze GitHub link: ${msg}`);
  }
}
