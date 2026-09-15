export interface RolePreset {
  id: string;
  category: 'role' | 'action';
  label: string;
  icon?: string;
  description: string;
  userPrompt: string;
}

export const ROLE_PRESETS: RolePreset[] = [
  // 1. Role Personas
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
    id: 'role_academic',
    category: 'role',
    label: 'Academic / Postdoc',
    icon: '🎓',
    description: 'Tailor for Academic CV: grant funding, peer-reviewed publications, and pedagogy',
    userPrompt:
      'Format and refine this content for an Academic / Postdoctoral CV. Highlight peer-reviewed publications, novel theoretical contributions, grant acquisition, collaborations, and pedagogical excellence in standard academic style.',
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

  // 2. High-Impact Resume Optimization Actions
  {
    id: 'action_verbs',
    category: 'action',
    label: 'Strong Action Verbs',
    icon: '⚡',
    description: 'Replace passive language with assertive leadership verbs',
    userPrompt:
      'Revise each bullet point to start with high-impact, assertive action verbs (e.g. "Architected", "Spearheaded", "Engineered", "Orchestrated", "Benchmarked"). Eliminate weak phrases like "responsible for" or "helped with".',
  },
  {
    id: 'add_metrics',
    category: 'action',
    label: 'Quantify Impact (XYZ)',
    icon: '🎯',
    description: 'Formulate bullet points using Google XYZ: Accomplished X by doing Y as measured by Z',
    userPrompt:
      'Rewrite these resume achievements following Google\'s XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]". Insert realistic quantifiable metric placeholders (e.g., % improvement, latency reduction, scale, users served) where needed.',
  },
  {
    id: 'one_page',
    category: 'action',
    label: 'Condense for 1-Page Fit',
    icon: '📄',
    description: 'Tighten bullet points by 20-30% to fit single-page resume layout',
    userPrompt:
      'Condense this resume content to fit cleanly onto a single page. Eliminate redundant filler words and tighten sentence structure while keeping all key technologies, achievements, and metrics intact.',
  },
  {
    id: 'fix_latex',
    category: 'action',
    label: 'Fix Resume LaTeX',
    icon: '🛠',
    description: 'Repair broken \\resumeItem, \\cventry, itemize, or formatting commands',
    userPrompt:
      'Inspect and fix any LaTeX syntax issues in this resume snippet: ensure all itemize / \\resumeItem / \\resumeSubheading commands are properly balanced, curly braces are closed, and formatting is clean.',
  },
];

// Backward compatibility alias
export const PRESET_PROMPTS = ROLE_PRESETS;
