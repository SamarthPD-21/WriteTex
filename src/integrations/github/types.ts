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
  relevanceScore?: number;
  roleMatchReason?: string;
  selected?: boolean;
}

export interface GitHubAnalysisResult {
  username: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  profileUrl: string;
  publicReposCount: number;
  topLanguages: { language: string; count: number }[];
  allTopics: string[];
  topProjects: GitHubRepo[];
  allProjects: GitHubRepo[];
  targetRole?: string;
  analyzedAt: number;
}
