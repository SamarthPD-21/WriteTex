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
 * Fetches and analyzes GitHub repositories for a given profile or repo link.
 */
export async function analyzeGitHubProfile(
  inputUrl: string,
  targetRoleKey?: string
): Promise<GitHubAnalysisResult> {
  const parsed = parseGitHubUrl(inputUrl);
  if (!parsed.isValid || !parsed.username) {
    throw new Error(
      'Invalid GitHub link. Please provide a valid profile or repository link (e.g., github.com/username or github.com/username/project).'
    );
  }

  const cacheKey = `${parsed.username.toLowerCase()}_${parsed.repoName || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    // Re-rank cached repos if role changed
    const reranked = rankRepositoriesByRole(cached.result.allProjects, targetRoleKey);
    return {
      ...cached.result,
      targetRole: targetRoleKey,
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
      const repo: GitHubRepo = {
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
        relevanceScore: 100,
        roleMatchReason: 'Directly featured user project.',
        selected: true,
      };

      const result: GitHubAnalysisResult = {
        username: parsed.username,
        profileUrl: `https://github.com/${parsed.username}`,
        publicReposCount: 1,
        topLanguages: [{ language: repo.language, count: 1 }],
        allTopics: repo.topics,
        topProjects: [repo],
        allProjects: [repo],
        targetRole: targetRoleKey,
        analyzedAt: Date.now(),
      };

      cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // 2. Full User Profile Mode
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${parsed.username}`, { headers }),
      fetch(
        `https://api.github.com/users/${parsed.username}/repos?sort=pushed&per_page=60`,
        { headers }
      ),
    ]);

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
    const rawRepos: RawGitHubRepo[] = reposRes.ok ? await reposRes.json() : [];

    const mappedRepos: GitHubRepo[] = rawRepos.map((r) => ({
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
    }));

    // Extract aggregated languages and topics
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

    // Rank by role
    const rankedRepos = rankRepositoriesByRole(mappedRepos, targetRoleKey);

    const result: GitHubAnalysisResult = {
      username: rawUser.login,
      name: rawUser.name || undefined,
      bio: rawUser.bio || undefined,
      avatarUrl: rawUser.avatar_url,
      profileUrl: rawUser.html_url,
      publicReposCount: rawUser.public_repos,
      topLanguages,
      allTopics: Array.from(topicsSet),
      topProjects: rankedRepos.slice(0, 4),
      allProjects: rankedRepos,
      targetRole: targetRoleKey,
      analyzedAt: Date.now(),
    };

    cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to analyze GitHub link: ${msg}`);
  }
}
