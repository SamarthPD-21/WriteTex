import { describe, expect, it } from 'vitest';
import { parseGitHubUrl } from '../src/integrations/github/url-parser';
import { rankRepositoriesByRole } from '../src/integrations/github/ranker';
import { GitHubRepo } from '../src/integrations/github/types';

describe('GitHub URL Parser', () => {
  it('parses full profile URLs with https and www', () => {
    const res1 = parseGitHubUrl('https://github.com/torvalds');
    expect(res1.isValid).toBe(true);
    expect(res1.isRepoUrl).toBe(false);
    expect(res1.username).toBe('torvalds');
    expect(res1.canonicalUrl).toBe('https://github.com/torvalds');

    const res2 = parseGitHubUrl('http://www.github.com/octocat/');
    expect(res2.isValid).toBe(true);
    expect(res2.username).toBe('octocat');
    expect(res2.isRepoUrl).toBe(false);
  });

  it('parses shorthand handles with or without @', () => {
    const res1 = parseGitHubUrl('@karpathy');
    expect(res1.isValid).toBe(true);
    expect(res1.username).toBe('karpathy');
    expect(res1.isRepoUrl).toBe(false);

    const res2 = parseGitHubUrl('geohot');
    expect(res2.isValid).toBe(true);
    expect(res2.username).toBe('geohot');
  });

  it('parses repository URLs correctly', () => {
    const res = parseGitHubUrl('https://github.com/astral-sh/uv.git');
    expect(res.isValid).toBe(true);
    expect(res.isRepoUrl).toBe(true);
    expect(res.username).toBe('astral-sh');
    expect(res.repoName).toBe('uv');
    expect(res.canonicalUrl).toBe('https://github.com/astral-sh/uv');
  });

  it('handles invalid or empty URLs gracefully', () => {
    expect(parseGitHubUrl('').isValid).toBe(false);
    expect(parseGitHubUrl('   ').isValid).toBe(false);
  });
});

describe('Role-Based GitHub Project Ranker', () => {
  const sampleRepos: GitHubRepo[] = [
    {
      name: 'micrograd-cuda',
      fullName: 'user/micrograd-cuda',
      description: 'A tiny PyTorch autograd engine implemented in CUDA and C++ with LLM transformer training',
      url: 'https://github.com/user/micrograd-cuda',
      htmlUrl: 'https://github.com/user/micrograd-cuda',
      language: 'Python',
      stars: 450,
      forks: 40,
      updatedAt: new Date().toISOString(),
      topics: ['deep-learning', 'pytorch', 'cuda', 'llm'],
      isFork: false,
    },
    {
      name: 'distributed-raft-kv',
      fullName: 'user/distributed-raft-kv',
      description: 'Distributed consensus key-value store using Raft, gRPC, and high throughput cache',
      url: 'https://github.com/user/distributed-raft-kv',
      htmlUrl: 'https://github.com/user/distributed-raft-kv',
      language: 'Go',
      stars: 120,
      forks: 15,
      updatedAt: new Date().toISOString(),
      topics: ['distributed-systems', 'grpc', 'raft', 'database'],
      isFork: false,
    },
    {
      name: 'nextjs-saas-dashboard',
      fullName: 'user/nextjs-saas-dashboard',
      description: 'Fullstack dashboard built with React, Next.js, Tailwind, PostgreSQL, and Prisma',
      url: 'https://github.com/user/nextjs-saas-dashboard',
      htmlUrl: 'https://github.com/user/nextjs-saas-dashboard',
      language: 'TypeScript',
      stars: 85,
      forks: 10,
      updatedAt: new Date().toISOString(),
      topics: ['react', 'nextjs', 'fullstack', 'tailwind'],
      isFork: false,
    },
    {
      name: 'k8s-gitops-infra',
      fullName: 'user/k8s-gitops-infra',
      description: 'Kubernetes cluster deployment with Terraform, ArgoCD, Prometheus, and AWS EKS',
      url: 'https://github.com/user/k8s-gitops-infra',
      htmlUrl: 'https://github.com/user/k8s-gitops-infra',
      language: 'HCL',
      stars: 30,
      forks: 5,
      updatedAt: new Date().toISOString(),
      topics: ['kubernetes', 'terraform', 'ci-cd', 'docker'],
      isFork: false,
    },
    {
      name: '.dotfiles',
      fullName: 'user/.dotfiles',
      description: 'My personal neovim and zsh config files',
      url: 'https://github.com/user/.dotfiles',
      htmlUrl: 'https://github.com/user/.dotfiles',
      language: 'Vim Script',
      stars: 0,
      forks: 0,
      updatedAt: new Date().toISOString(),
      topics: ['dotfiles'],
      isFork: false,
    },
    {
      name: 'forked-repo',
      fullName: 'user/forked-repo',
      description: 'Forked repository with no changes',
      url: 'https://github.com/user/forked-repo',
      htmlUrl: 'https://github.com/user/forked-repo',
      language: 'JavaScript',
      stars: 0,
      forks: 0,
      updatedAt: '2021-01-01T00:00:00Z',
      topics: [],
      isFork: true,
    },
  ];

  it('ranks AI/ML projects first for role_aiml', () => {
    const ranked = rankRepositoriesByRole(sampleRepos, 'role_aiml');
    expect(ranked[0].name).toBe('micrograd-cuda');
    expect(ranked[0].roleMatchReason).toContain('deep learning');
    expect(ranked[0].selected).toBe(true);

    const lastRepo = ranked[ranked.length - 1];
    expect(lastRepo.name === '.dotfiles' || lastRepo.name === 'forked-repo').toBe(true);
  });

  it('ranks distributed systems project first for role_swe', () => {
    const ranked = rankRepositoriesByRole(sampleRepos, 'role_swe');
    expect(ranked[0].name).toBe('distributed-raft-kv');
    expect(ranked[0].roleMatchReason).toContain('distributed systems');
  });

  it('ranks fullstack project first for role_fullstack', () => {
    const ranked = rankRepositoriesByRole(sampleRepos, 'role_fullstack');
    expect(ranked[0].name).toBe('nextjs-saas-dashboard');
    expect(ranked[0].roleMatchReason).toContain('fullstack');
  });

  it('ranks infrastructure project first for role_devops', () => {
    const ranked = rankRepositoriesByRole(sampleRepos, 'role_devops');
    expect(ranked[0].name).toBe('k8s-gitops-infra');
    expect(ranked[0].roleMatchReason).toContain('cloud infrastructure');
  });

  it('penalizes dotfiles and inactive forks heavily', () => {
    const ranked = rankRepositoriesByRole(sampleRepos, 'role_swe');
    const dotfiles = ranked.find((r) => r.name === '.dotfiles');
    const fork = ranked.find((r) => r.name === 'forked-repo');
    const sweProject = ranked.find((r) => r.name === 'distributed-raft-kv');

    expect((sweProject?.relevanceScore || 0)).toBeGreaterThan(dotfiles?.relevanceScore || 0);
    expect((sweProject?.relevanceScore || 0)).toBeGreaterThan(fork?.relevanceScore || 0);
  });
});
