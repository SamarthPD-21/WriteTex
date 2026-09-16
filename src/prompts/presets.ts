export interface BasePreset {
  id: string;
  label: string;
  icon?: string;
  description: string;
  userPrompt: string;
}

export interface ResumePreset extends BasePreset {
  category: 'role' | 'action';
}

export interface CoverLetterPreset extends BasePreset {
  category: 'section' | 'tone';
}

// Backward compatibility type
export type RolePreset = ResumePreset;

// ==========================================
// RESUME / CV PRESETS
// ==========================================

export const RESUME_ROLE_PRESETS: ResumePreset[] = [
  {
    id: 'role_swe',
    category: 'role',
    label: 'Software Engineer',
    icon: '💻',
    description: 'Tailor for SWE: system architecture, scalability, latency, and technical stack',
    userPrompt:
      'Tailor and optimize this resume content for a Senior Software Engineer role. Emphasize distributed systems architecture, scalability, performance optimizations, robust engineering practices, and measurable technical impact using strong action verbs.',
  },
  {
    id: 'role_aiml',
    category: 'role',
    label: 'AI / ML Engineer',
    icon: '🧠',
    description: 'Tailor for AI/ML: model architectures, training throughput, and SOTA benchmarks',
    userPrompt:
      'Tailor and refine this resume content for an AI/ML Research Engineer role. Highlight model architectures, training efficiency, dataset curation, loss optimization, SOTA benchmarks, and scalable ML serving pipelines.',
  },
  {
    id: 'role_fullstack',
    category: 'role',
    label: 'Full Stack Engineer',
    icon: '🌐',
    description: 'Tailor for Full Stack: end-to-end architectures, React/Next.js, Node/Go, APIs',
    userPrompt:
      'Tailor this resume content for a Senior Full Stack Engineer role. Highlight responsive frontend UI architecture, robust REST/GraphQL APIs, database modeling, cloud services, and end-to-end feature ownership.',
  },
  {
    id: 'role_pm',
    category: 'role',
    label: 'Product Manager',
    icon: '🚀',
    description: 'Tailor for PM: product roadmaps, cross-functional leadership, and user growth',
    userPrompt:
      'Tailor this resume content for a Technical Product Manager role. Focus on customer discovery, roadmaps, cross-functional engineering alignment, conversion funnels, retention metrics, and top-line business impact.',
  },
  {
    id: 'role_data',
    category: 'role',
    label: 'Data Scientist',
    icon: '📊',
    description: 'Tailor for Data Science: predictive models, A/B experiments, and business insights',
    userPrompt:
      'Tailor this resume content for a Senior Data Scientist role. Emphasize statistical experimentation (A/B testing), causal inference, predictive modeling, data pipelines, and translating complex analyses into executive decisions.',
  },
  {
    id: 'role_quant',
    category: 'role',
    label: 'Quant / Finance',
    icon: '📈',
    description: 'Tailor for Quant/FinTech: low-latency, statistical arbitrage, and risk modeling',
    userPrompt:
      'Tailor this resume content for a Quantitative Developer / Researcher role. Emphasize algorithmic precision, low-latency execution, statistical arbitrage, risk models, and mathematical rigor.',
  },
  {
    id: 'role_devops',
    category: 'role',
    label: 'DevOps / Cloud',
    icon: '☁️',
    description: 'Tailor for Cloud & DevOps: Kubernetes, CI/CD, Terraform, 99.99% uptime',
    userPrompt:
      'Tailor this resume content for a Senior DevOps / Cloud Infrastructure role. Emphasize Kubernetes orchestration, Terraform IaC, automated CI/CD pipelines, site reliability (SRE), cost reduction, and high availability.',
  },
  {
    id: 'role_security',
    category: 'role',
    label: 'Cybersecurity',
    icon: '🛡️',
    description: 'Tailor for Security: threat modeling, zero trust, pen testing, compliance',
    userPrompt:
      'Tailor this resume content for an Information Security / Application Security Engineer role. Focus on threat modeling, zero-trust architecture, penetration testing, vulnerability remediation, and automated security controls.',
  },
  {
    id: 'role_exec',
    category: 'role',
    label: 'Eng Manager / Lead',
    icon: '👔',
    description: 'Tailor for Leadership: team mentorship, hiring, org growth, and delivery',
    userPrompt:
      'Tailor this resume content for an Engineering Manager / Tech Lead role. Emphasize hiring, engineering culture, team mentorship, project delivery velocity, stakeholder management, and organizational impact.',
  },
  {
    id: 'role_academic',
    category: 'role',
    label: 'Academic / Postdoc',
    icon: '🎓',
    description: 'Tailor for Academic CV: grant funding, peer-reviewed publications, and pedagogy',
    userPrompt:
      'Format and refine this content for an Academic / Postdoctoral CV. Highlight peer-reviewed publications, novel theoretical contributions, grant acquisition, collaborations, and pedagogical excellence in standard academic style.',
  },
];

export const RESUME_ACTION_PRESETS: ResumePreset[] = [
  {
    id: 'action_xyz',
    category: 'action',
    label: 'Google XYZ Formula',
    icon: '🎯',
    description: 'Accomplished [X] as measured by [Y] by doing [Z]',
    userPrompt:
      'Rewrite these resume achievements following Google\'s XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]". Insert realistic quantifiable metric placeholders (e.g., % improvement, latency reduction, scale, users served) where needed. Keep the candidate\'s real company, dates, and technologies intact.',
  },
  {
    id: 'action_verbs',
    category: 'action',
    label: 'Strong Action Verbs',
    icon: '⚡',
    description: 'Replace passive language with assertive leadership verbs',
    userPrompt:
      'Revise each bullet point to start with high-impact, assertive action verbs (e.g. "Architected", "Spearheaded", "Engineered", "Orchestrated", "Benchmarked"). Eliminate weak phrases like "responsible for" or "helped with". Keep all real company names, dates, and project details intact; do not invent fictional companies or extra headers.',
  },
  {
    id: 'action_metrics',
    category: 'action',
    label: 'Quantify Impact',
    icon: '📈',
    description: 'Inject concrete scale, dollar savings, throughput, and % metrics',
    userPrompt:
      'Enhance each bullet point with concrete quantifiable results and scale indicators (e.g. TPS, percentage latency reduction, cost savings, user scale, team size, data volume). Preserve existing technologies and organizations.',
  },
  {
    id: 'action_one_page',
    category: 'action',
    label: 'Condense for 1-Page Fit',
    icon: '📄',
    description: 'Tighten bullet points by 20-30% to fit single-page resume layout',
    userPrompt:
      'Condense this resume content to fit cleanly onto a single page. Eliminate redundant filler words and tighten sentence structure while keeping all key technologies, achievements, and metrics intact.',
  },
  {
    id: 'action_ats',
    category: 'action',
    label: 'ATS Keyword Optimizer',
    icon: '🔍',
    description: 'Optimize vocabulary and tech stacks for ATS scanner scoring',
    userPrompt:
      'Analyze and optimize these resume bullets for Applicant Tracking Systems (ATS). Incorporate standard industry keywords, technical competencies, and role-specific terminology without buzzword stuffing.',
  },
  {
    id: 'action_skills_matrix',
    category: 'action',
    label: 'Skills Matrix Polish',
    icon: '📋',
    description: 'Organize into clean LaTeX tabular technical skills categories',
    userPrompt:
      'Format and organize these technical skills into a clean, categorized LaTeX structure (e.g. Languages, Frameworks, Developer Tools, Cloud / Platforms). Ensure valid LaTeX syntax and appropriate grouping.',
  },
  {
    id: 'action_fix_latex',
    category: 'action',
    label: 'Fix LaTeX Errors',
    icon: '🛠',
    description: 'Repair corrupted macros, missing backslashes, unclosed braces, and undefined sequences',
    userPrompt:
      'Fix all LaTeX errors and restore broken or truncated macros in this code:\n' +
      '1. Restore truncated macros: change "n{...}" or "ection{...}" to "\\section{...}", change "SubHeadingListStart" or "meSubheading" to "\\resumeSubHeadingListStart" or "\\resumeSubheading", change "meItemListStart" to "\\resumeItemListStart", change "meItemListEnd" to "\\resumeItemListEnd", change "sumeItem{" to "\\resumeItem{", change "xtit{" to "\\textit{", change "textbf{" to "\\textbf{".\n' +
      '2. Ensure all curly braces {} and brackets [] are balanced.\n' +
      '3. Ensure \\documentclass and \\begin{document} / \\end{document} are present and balanced if this is a full document.\n' +
      '4. Escape % as \\%, & as \\& (except in tabular columns), and $ as \\$.\n' +
      '5. Return ONLY the corrected compilable LaTeX code with no conversational filler.',
  },
  {
    id: 'action_restore_preamble',
    category: 'action',
    label: 'Restore Preamble',
    icon: '📑',
    description: 'Restore missing \\documentclass, packages, custom resume commands, and \\begin{document}',
    userPrompt:
      'Generate the complete missing preamble for Jake\'s Resume: include \\documentclass[letterpaper,11pt]{article}, packages (latexsym, fullpage, titlesec, marvosym, color, verbatim, enumitem, hyperref, fancyhdr, babel, tabularx), custom macros (\\resumeItem, \\resumeSubheading, \\resumeSubSubheading, \\resumeProjectHeading, \\resumeSubHeadingListStart/End, \\resumeItemListStart/End), margins, and \\begin{document}. Return ONLY the valid preamble block.',
  },
  {
    id: 'action_github_projects',
    category: 'action',
    label: 'Auto-Add GitHub Projects',
    icon: '🐙',
    description: 'Format analyzed top GitHub projects into \\resumeProjectHeading with Google XYZ bullets',
    userPrompt:
      'Transform the analyzed top GitHub projects into a high-impact LaTeX Projects section. Format each project using the template convention:\n\\resumeProjectHeading{\\textbf{Project Name} $|$ \\emph{Tech Stack}}{\\href{https://github.com/...}{\\underline{github.com/...}}}\n\\resumeItemListStart\n  \\resumeItem{Accomplished [X] by doing [Y] as measured by [Z] (concrete metrics, latency, scale, stars).}\n  \\resumeItem{Architectural design, system constraints, or core engineering achievement.}\n\\resumeItemListEnd\nStrictly cap the Tech Stack in \\emph{...} to 3-4 core technologies (e.g. \\emph{Java, Spring Boot, Oracle DB}) so it stays on a single line. Do not list secondary utilities (Git, CI/CD, JUnit, REST APIs) in the heading or stuff them in bullets. Tailor the achievements and technical depth directly to the target role.',
  },
  {
    id: 'action_github_skills',
    category: 'action',
    label: 'Sync GitHub Skills',
    icon: '⚡',
    description: 'Extract tech stack from GitHub repos and update the LaTeX technical skills table',
    userPrompt:
      'Extract all primary languages, frameworks, and developer tools used across the analyzed GitHub projects, and synthesize them into a clean LaTeX technical skills matrix categorized by Languages, Frameworks / Libraries, Developer Tools, and Cloud / Infrastructure.',
  },
];

export const ROLE_PRESETS: ResumePreset[] = [
  ...RESUME_ROLE_PRESETS,
  ...RESUME_ACTION_PRESETS,
];

// Backward compatibility alias
export const PRESET_PROMPTS = ROLE_PRESETS;

// ==========================================
// COVER LETTER PRESETS
// ==========================================

export const COVER_LETTER_SECTION_PRESETS: CoverLetterPreset[] = [
  {
    id: 'cl_github_story',
    category: 'section',
    label: 'Feature GitHub Project Story',
    icon: '🐙',
    description: 'Weave the candidate\'s best GitHub project into a compelling STAR technical narrative',
    userPrompt:
      'Select the candidate\'s most impressive GitHub project that best aligns with the target role and company. Craft a compelling STAR (Situation, Task, Action, Result) body paragraph for the cover letter: introduce the problem space, detail the system architecture and technical decisions (mentioning the project link and technologies), and highlight the measurable outcome or community adoption.',
  },
  {
    id: 'cl_draft_full',
    category: 'section',
    label: 'Draft Full Letter',
    icon: '✨',
    description: 'Draft a complete 3-4 paragraph tailored cover letter from resume context',
    userPrompt:
      'Draft a compelling, highly personalized 3-4 paragraph cover letter based on the provided resume context and target role. Structure it with an engaging opening hook, 1-2 concrete STAR evidence stories demonstrating relevant technical impact, company mission alignment, and a confident closing call to action. Provide clean, compilable LaTeX.',
  },
  {
    id: 'cl_match_jd',
    category: 'section',
    label: 'Match Job Description',
    icon: '🎯',
    description: 'Map selected resume experience directly to target job requirements',
    userPrompt:
      'Generate a targeted cover letter section that directly bridges the candidate\'s highlighted accomplishments with the specific requirements and responsibilities of the target job description. Prove immediate value add.',
  },
  {
    id: 'cl_hook',
    category: 'section',
    label: 'Opening Hook',
    icon: '🪝',
    description: 'Write a punchy, memorable opening paragraph that grabs attention',
    userPrompt:
      'Write a high-impact opening paragraph for this cover letter. Avoid clichés like "I am writing to apply for...". Instead, start with a confident statement of value, genuine knowledge of the company\'s technical challenges or mission, and immediate enthusiasm.',
  },
  {
    id: 'cl_star_body',
    category: 'section',
    label: 'STAR Evidence Story',
    icon: '⭐',
    description: 'Transform achievements into a compelling Situation-Task-Action-Result narrative',
    userPrompt:
      'Convert the selected resume bullet points into an engaging STAR (Situation, Task, Action, Result) narrative paragraph for the body of a cover letter. Focus on technical problem solving, agency, and quantifiable business outcome.',
  },
  {
    id: 'cl_why_company',
    category: 'section',
    label: 'Why This Company',
    icon: '🏢',
    description: 'Align candidate passions with the company\'s mission and recent engineering work',
    userPrompt:
      'Write a compelling "Why this company" paragraph. Articulate genuine alignment with the company\'s vision, engineering ethos, product milestones, and explain why this specific environment is where the candidate will do their best work.',
  },
  {
    id: 'cl_closing',
    category: 'section',
    label: 'Call to Action (Closing)',
    icon: '🤝',
    description: 'Professional, assertive closing requesting a conversation',
    userPrompt:
      'Write a polished, confident concluding paragraph. Reiterate excitement for the role, summarize core value proposition in one sentence, and include a clear, professional call to action for an interview.',
  },
  {
    id: 'cl_latex_template',
    category: 'section',
    label: 'LaTeX Letterhead',
    icon: '📜',
    description: 'Format content in a professional LaTeX letterhead layout',
    userPrompt:
      'Format this cover letter snippet into professional LaTeX letter format (using standard \\opening{Dear Hiring Team,} and \\closing{Sincerely,} or elegant article letterhead). Ensure all special characters are properly escaped.',
  },
];

export const COVER_LETTER_TONE_PRESETS: CoverLetterPreset[] = [
  {
    id: 'cl_tone_confident',
    category: 'tone',
    label: 'Confident & Direct',
    icon: '🦁',
    description: 'Crisp, high-conviction, authoritative executive tone',
    userPrompt:
      'Rewrite this cover letter with a confident, authoritative, and direct tone. Eliminate timid phrasing (e.g. "I feel", "I think", "hope to"), and emphasize track record, decisive leadership, and tangible results.',
  },
  {
    id: 'cl_tone_technical',
    category: 'tone',
    label: 'Technical & Deep',
    icon: '⚙️',
    description: 'Focused on engineering craftsmanship, architectures, and system depth',
    userPrompt:
      'Rewrite this cover letter with a deep technical voice tailored for engineering hiring managers. Detail architectural trade-offs, system constraints, algorithmic choices, and technical craftsmanship.',
  },
  {
    id: 'cl_tone_startup',
    category: 'tone',
    label: 'Startup / Passionate',
    icon: '🔥',
    description: 'High agency, fast execution, mission-driven founder mentality',
    userPrompt:
      'Rewrite this cover letter for a fast-moving startup environment. Emphasize high agency, rapid prototyping, 0-to-1 ownership, versatility, customer empathy, and genuine passion for the product.',
  },
  {
    id: 'cl_tone_visionary',
    category: 'tone',
    label: 'Strategic / Executive',
    icon: '🔭',
    description: 'Focus on strategic roadmaps, cross-functional scale, and business impact',
    userPrompt:
      'Rewrite this cover letter with an executive and strategic framing. Emphasize cross-functional organizational alignment, product vision, market positioning, engineering culture, and long-term business leverage.',
  },
];

export const COVER_LETTER_PRESETS: CoverLetterPreset[] = [
  ...COVER_LETTER_SECTION_PRESETS,
  ...COVER_LETTER_TONE_PRESETS,
];
