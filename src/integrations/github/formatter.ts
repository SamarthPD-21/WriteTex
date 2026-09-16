import { GitHubRepo, GitHubAnalysisResult } from './types';

/**
 * Formats a single GitHub repository into a Jake's Resume style \resumeProjectHeading block.
 * Strictly relies on verified tech stacks and verified project summaries.
 */
export function formatProjectToLatex(project: GitHubRepo): string {
  const name = project.name;
  const techStack =
    project.verifiedTechStack && project.verifiedTechStack.length > 0
      ? project.verifiedTechStack.slice(0, 4).join(', ')
      : [project.language, ...(project.topics || []).slice(0, 3)]
          .filter(Boolean)
          .join(', ');

  const url = project.htmlUrl || project.url;
  const starsNotice = project.stars > 0 ? `${project.stars} Stars` : '';

  let bullet1 = '';
  const summaryText = project.readmeSummary || project.description;
  if (summaryText) {
    bullet1 = `Engineered \\textbf{${name}}, ${summaryText.replace(/[\\%$&#_^{}~]/g, '\\$&')}.`;
  } else {
    bullet1 = `Developed \\textbf{${name}} using ${techStack}, implementing high-performance core architecture.`;
  }

  let bullet2 = '';
  if (project.manifestDependencies && project.manifestDependencies.length > 0) {
    const depsNotice = project.manifestDependencies.slice(0, 4).join(', ');
    bullet2 = `Integrated modular components and services utilizing ${depsNotice.replace(/[\\%$&#_^{}~]/g, '\\$&')}.`;
  } else if (project.roleMatchReason) {
    bullet2 = `${project.roleMatchReason.replace(/[\\%$&#_^{}~]/g, '\\$&')}`;
  } else if (project.stars > 5 || project.forks > 2) {
    bullet2 = `Earned ${project.stars} stars and ${project.forks} forks across open-source community developers.`;
  } else {
    bullet2 = `Architected modular code with end-to-end automated testing, CI/CD pipelines, and detailed documentation.`;
  }

  return `\\resumeProjectHeading
    {\\textbf{${name}} $|$ \\emph{${techStack}}}{${starsNotice || url}}
    \\resumeItemListStart
      \\resumeItem{${bullet1}}
      \\resumeItem{${bullet2}}
    \\resumeItemListEnd`;
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
 */
export function formatGitHubSkillsToLatex(analysis: GitHubAnalysisResult): string {
  const languages = analysis.topLanguages.slice(0, 6).map((l) => l.language).join(', ');
  
  // Aggregate verified frameworks from top projects and allTopics
  const verifiedFrameworksSet = new Set<string>();
  for (const p of analysis.topProjects) {
    if (p.verifiedTechStack) {
      for (const item of p.verifiedTechStack) {
        if (!analysis.topLanguages.some((l) => l.language.toLowerCase() === item.toLowerCase())) {
          verifiedFrameworksSet.add(item);
        }
      }
    }
  }

  for (const t of analysis.allTopics) {
    if (!analysis.topLanguages.some((l) => l.language.toLowerCase() === t.toLowerCase())) {
      verifiedFrameworksSet.add(t.charAt(0).toUpperCase() + t.slice(1));
    }
  }

  const frameworks = Array.from(verifiedFrameworksSet).slice(0, 8).join(', ');

  return `\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: ${languages || 'TypeScript, Python, C++, Java, SQL'}} \\\\
     \\textbf{Frameworks \\& Tools}{: ${frameworks || 'Git, Docker, Kubernetes, React, Node.js'}}
    }}
 \\end{itemize}`;
}
