export interface ParsedGitHubUrl {
  isValid: boolean;
  username?: string;
  repoName?: string;
  isRepoUrl: boolean;
  canonicalUrl: string;
}

/**
 * Parses user profile URLs, repo URLs, or GitHub handles into canonical metadata.
 */
export function parseGitHubUrl(input: string): ParsedGitHubUrl {
  const trimmed = input.trim().replace(/^@/, '');
  if (!trimmed) {
    return { isValid: false, isRepoUrl: false, canonicalUrl: '' };
  }

  // Strip protocol and github.com host prefix
  let path = trimmed;
  path = path.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\/?/i, '');
  path = path.replace(/\.git$/i, '');
  path = path.replace(/\/+$/, '');

  const segments = path.split('/').filter(Boolean);

  if (segments.length === 1) {
    const username = segments[0];
    if (/^[a-zA-Z0-9_-]+$/.test(username)) {
      return {
        isValid: true,
        username,
        isRepoUrl: false,
        canonicalUrl: `https://github.com/${username}`,
      };
    }
  }

  if (segments.length >= 2) {
    const username = segments[0];
    const repoName = segments[1];
    return {
      isValid: true,
      username,
      repoName,
      isRepoUrl: true,
      canonicalUrl: `https://github.com/${username}/${repoName}`,
    };
  }

  return { isValid: false, isRepoUrl: false, canonicalUrl: '' };
}
