import { GitHubRepo, GitHubAnalysisResult } from './types';

/** Escapes LaTeX special characters in plain text. */
export function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([%$&#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/** Escapes the characters that break a URL inside \href. */
function escapeUrl(url: string): string {
  return url.replace(/([%#])/g, '\\$1');
}

function stripTrailingPeriod(text: string): string {
  return text.trim().replace(/[.\s]+$/, '');
}

/**
 * Formats a single GitHub repository into a Jake's Resume style \resumeProjectHeading block.
 * Uses only verified facts from the repository; nothing is invented to fill gaps.
 */
export function formatProjectToLatex(project: GitHubRepo): string {
  const name = escapeLatex(project.name);
  const techStack = escapeLatex(
    project.verifiedTechStack && project.verifiedTechStack.length > 0
      ? project.verifiedTechStack.slice(0, 4).join(', ')
      : [project.language, ...(project.topics || []).slice(0, 3)].filter(Boolean).join(', ')
  );

  const url = project.htmlUrl || project.url;
  const rightColumn =
    project.stars > 0
      ? `${project.stars} Stars`
      : url
      ? `\\href{${escapeUrl(url)}}{\\underline{${escapeLatex(url.replace(/^https?:\/\//, ''))}}}`
      : '';

  const bullets: string[] = [];
  const summaryText = project.readmeSummary || project.description;
  if (summaryText) {
    bullets.push(`Built \\textbf{${name}}: ${escapeLatex(stripTrailingPeriod(summaryText))}.`);
  } else if (techStack) {
    bullets.push(`Built \\textbf{${name}} with ${techStack}.`);
  }

  if (project.manifestDependencies && project.manifestDependencies.length > 0) {
    bullets.push(`Integrated ${escapeLatex(project.manifestDependencies.slice(0, 4).join(', '))}.`);
  } else if (project.roleMatchReason) {
    bullets.push(escapeLatex(stripTrailingPeriod(project.roleMatchReason)) + '.');
  }
  if (project.stars > 5 || project.forks > 2) {
    bullets.push(`Adopted by the open-source community: ${project.stars} stars and ${project.forks} forks.`);
  }

  const bulletLines = bullets.map((b) => `      \\resumeItem{${b}}`).join('\n');
  return `\\resumeProjectHeading
    {\\textbf{${name}}${techStack ? ` $|$ \\emph{${techStack}}` : ''}}{${rightColumn}}${
      bullets.length > 0 ? `\n    \\resumeItemListStart\n${bulletLines}\n    \\resumeItemListEnd` : ''
    }`;
}

/**
 * Formats all selected GitHub repositories into a complete LaTeX \section{Projects}.
 */
export function formatAllProjectsToLatex(projects: GitHubRepo[]): string {
  const selected = projects.filter((p) => p.selected !== false);
  const toFormat = selected.length > 0 ? selected : projects.slice(0, 3);

  const formattedProjects = toFormat.map(formatProjectToLatex).join('\n\n');

  return `\\section{Projects}
\\resumeSubHeadingListStart
${formattedProjects}
\\resumeSubHeadingListEnd`;
}

/**
 * Formats extracted GitHub languages and topics into a LaTeX \section{Technical Skills}.
 * Lines with no verified data are left out rather than filled with generic skills.
 */
export function formatGitHubSkillsToLatex(analysis: GitHubAnalysisResult): string {
  const isLanguage = (item: string) =>
    analysis.topLanguages.some((l) => l.language.toLowerCase() === item.toLowerCase());
  const languages = analysis.topLanguages.slice(0, 6).map((l) => l.language);

  const frameworks = new Set<string>();
  for (const p of analysis.topProjects) {
    for (const item of p.verifiedTechStack || []) {
      if (!isLanguage(item)) frameworks.add(item);
    }
  }
  for (const t of analysis.allTopics) {
    if (!isLanguage(t)) frameworks.add(t.charAt(0).toUpperCase() + t.slice(1));
  }

  const lines: string[] = [];
  if (languages.length > 0) {
    lines.push(`     \\textbf{Languages}{: ${escapeLatex(languages.join(', '))}}`);
  }
  if (frameworks.size > 0) {
    lines.push(`     \\textbf{Frameworks \\& Tools}{: ${escapeLatex(Array.from(frameworks).slice(0, 8).join(', '))}}`);
  }

  return `\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${lines.join(' \\\\\n')}
    }}
 \\end{itemize}`;
}
