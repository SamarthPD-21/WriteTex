export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  htmlUrl: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  topics: string[];
  isFork: boolean;
  defaultBranch?: string;
  relevanceScore?: number;
  roleMatchReason?: string;
  selected?: boolean;
  // Verified ground-truth data extracted from repository code/manifest
  verifiedTechStack?: string[];
  manifestDependencies?: string[];
  readmeSummary?: string;
}

export interface GitHubAnalysisResult {
  username: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  profileUrl: string;
  publicReposCount: number;
  totalStars?: number;
  totalForks?: number;
  topLanguages: { language: string; count: number }[];
  allTopics: string[];
  topProjects: GitHubRepo[];
  allProjects: GitHubRepo[];
  targetRole?: string;
  targetJobDescription?: string;
  analyzedAt: number;
}
