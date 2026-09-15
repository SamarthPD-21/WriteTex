export interface PresetPrompt {
  id: string;
  label: string;
  description: string;
  userPrompt: string;
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'rewrite',
    label: 'Rewrite',
    description: 'Rewrite for maximum clarity while preserving technical meaning',
    userPrompt: 'Rewrite this passage to be clearer, more concise, and precise while strictly preserving all technical facts, notation, and citation/label references.',
  },
  {
    id: 'academic',
    label: 'Academic Tone',
    description: 'Elevate tone for peer-reviewed journal/conference submission',
    userPrompt: 'Elevate the tone of this passage to formal, rigorous academic English suitable for top-tier peer-reviewed venues. Avoid colloquialisms and maintain objective scientific prose.',
  },
  {
    id: 'fix_grammar',
    label: 'Fix Grammar',
    description: 'Correct grammar, typos, punctuation, and phrasing',
    userPrompt: 'Fix any grammatical, typographical, punctuation, and stylistic errors in this LaTeX snippet without altering the intended meaning.',
  },
  {
    id: 'shorten',
    label: 'Shorten',
    description: 'Condense length by ~25-30% without losing critical details',
    userPrompt: 'Condense this text by roughly 25-30% to save page space, eliminating redundancy while retaining all vital arguments, equations, and references.',
  },
  {
    id: 'expand',
    label: 'Expand',
    description: 'Elaborate with deeper explanation and scientific rationale',
    userPrompt: 'Elaborate on this explanation with deeper scientific rationale, smoother logical transitions, and clearer intuition.',
  },
  {
    id: 'fix_latex',
    label: 'Fix LaTeX',
    description: 'Resolve syntax errors, unbalanced braces, and math delimiter bugs',
    userPrompt: 'Identify and fix any LaTeX syntax errors, unbalanced braces, mismatched environments, broken math delimiters, or macro mistakes in this code.',
  },
  {
    id: 'equation',
    label: 'Fix Equation',
    description: 'Format, align, and clean up mathematical equation syntax',
    userPrompt: 'Refine this LaTeX mathematical equation for correct formatting, proper alignment delimiters, standard notation conventions (e.g. \\mathbf, \\mathcal), and balanced brackets.',
  },
  {
    id: 'explain',
    label: 'Explain',
    description: 'Explain what this equation or passage represents in plain English',
    userPrompt: 'Explain this LaTeX code and its mathematical/conceptual meaning clearly in plain English.',
  },
];
