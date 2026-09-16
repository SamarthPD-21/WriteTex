export type AIProviderId = 'meta' | 'gemini' | 'openai' | 'anthropic';

export type ModelBadge = 'Fast' | 'Best' | 'Latest' | 'Efficient' | 'Reasoning';

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProviderId;
  description?: string;
  badge?: ModelBadge;
  recommended?: boolean;
}

export interface Settings {
  provider: AIProviderId;
  apiKeys: {
    meta: string;
    gemini: string;
    openai: string;
    anthropic: string;
  };
  model: string;
  customModelId?: string;
  temperature: number;
  contextScope: 'selection' | 'file';
  autoCollapseOnApply: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  apiKeys: {
    meta: '',
    gemini: '',
    openai: '',
    anthropic: '',
  },
  model: 'gemini-3.8-flash',
  customModelId: '',
  temperature: 0.2,
  contextScope: 'selection',
  autoCollapseOnApply: false,
};

export const AVAILABLE_MODELS: Record<AIProviderId, ModelInfo[]> = {
  meta: [
    {
      id: 'muse-spark-1.3',
      name: 'Meta Spark 1.3',
      provider: 'meta',
      badge: 'Latest',
      recommended: true,
      description: 'Meta Superintelligence flagship. 1M context, 25% fewer tokens, agentic.',
    },
    {
      id: 'muse-spark-1.2',
      name: 'Meta Spark 1.2',
      provider: 'meta',
      badge: 'Fast',
      description: 'Optimized for high-speed technical writing, editing, and code.',
    },
    {
      id: 'muse-spark-1.3-contributor',
      name: 'Meta Spark 1.3 (Contributor)',
      provider: 'meta',
      badge: 'Reasoning',
      description: 'High-reasoning effort variant for complex mathematical derivations.',
    },
    {
      id: 'llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B',
      provider: 'meta',
      badge: 'Efficient',
      description: 'Fast, highly efficient open foundation model for academic text.',
    },
  ],
  gemini: [
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
      provider: 'gemini',
      badge: 'Latest',
      recommended: true,
      description: 'Google flagship ultra-fast model with sub-second latency and agentic editing.',
    },
    {
      id: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash',
      provider: 'gemini',
      badge: 'Fast',
      description: 'Optimized for high-efficiency token generation and fast LaTeX edits.',
    },
    {
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      provider: 'gemini',
      badge: 'Efficient',
      description: 'Next-gen high-speed balanced model for rapid phrasing and formatting.',
    },
    {
      id: 'gemma-31b-it',
      name: 'Gemma 3 31B IT',
      provider: 'gemini',
      badge: 'Latest',
      description: 'Google open weights instruction model for structured technical writing.',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      badge: 'Fast',
      description: 'Google production flagship model with instant sub-second responses.',
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite',
      provider: 'gemini',
      badge: 'Efficient',
      description: 'Sub-200ms lightweight token generation for lightning-fast edits.',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'gemini',
      badge: 'Latest',
      description: 'Next-gen balanced model for comprehensive resume synthesis.',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'gemini',
      badge: 'Reasoning',
      description: 'Deep reasoning model for intricate LaTeX proofs and long documents.',
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      badge: 'Best',
      recommended: true,
      description: 'High-capability flagship model for text and math.',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      provider: 'openai',
      badge: 'Efficient',
      description: 'Cost-effective and fast for paper polishing.',
    },
    {
      id: 'o3-mini',
      name: 'o3-mini',
      provider: 'openai',
      badge: 'Reasoning',
      description: 'Advanced STEM reasoning for mathematics and equations.',
    },
  ],
  anthropic: [
    {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
      badge: 'Latest',
      recommended: true,
      description: 'Top-tier academic prose quality and hybrid reasoning.',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      badge: 'Efficient',
      description: 'Ultra-fast latency for grammar, vocabulary, and conciseness.',
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      badge: 'Best',
      description: 'High precision and nuanced academic vocabulary.',
    },
  ],
};

import { GitHubAnalysisResult } from '../integrations/github/types';
import { OverleafLogEntry } from '../adapters/overleaf/error-scraper';
import { FileAttachment } from '../integrations/files/types';

export type DocumentMode = 'resume' | 'cover_letter';

export interface EditorContext {
  selectedText?: string;
  currentFileContent?: string;
  currentFileName?: string;
  cursorPosition?: number;
  selectionFrom?: number;
  selectionTo?: number;
  currentLineNumber?: number;
  currentLineText?: string;
  docMode?: DocumentMode;
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
  githubAnalysis?: GitHubAnalysisResult;
  overleafErrors?: OverleafLogEntry[];
  hasNoPdf?: boolean;
  attachedFiles?: FileAttachment[];
}

export interface GenerateRequest {
  requestId: string;
  userPrompt: string;
  presetKey?: string;
  context: EditorContext;
  model: string;
  provider: AIProviderId;
  temperature: number;
}

// Service Worker Messages
export type RuntimeMessage =
  | { type: 'WRITETEX_GENERATE'; payload: GenerateRequest }
  | { type: 'WRITETEX_CANCEL_GENERATE'; payload: { requestId: string } }
  | { type: 'WRITETEX_GET_SETTINGS' }
  | { type: 'WRITETEX_SAVE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'WRITETEX_VALIDATE_KEY'; payload: { provider: AIProviderId; apiKey: string } }
  | { type: 'WRITETEX_ANALYZE_GITHUB'; payload: { url: string; targetRole?: string } };

export type StreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; error: string };

// MAIN world CM6 Bridge Messages (via window.postMessage)
export const BRIDGE_MSG_SOURCE_PAGE = 'WRITETEX_CM6_BRIDGE';
export const BRIDGE_MSG_SOURCE_CONTENT = 'WRITETEX_CONTENT_SCRIPT';

export interface SelectionRange {
  from: number;
  to: number;
  text: string;
  empty: boolean;
  cursor: number;
}

export interface CurrentLineInfo {
  number: number;
  text: string;
  from: number;
  to: number;
}

export type BridgeCommand =
  | { type: 'PING' }
  | { type: 'GET_SELECTION' }
  | { type: 'GET_CONTENT' }
  | { type: 'GET_CURRENT_LINE' }
  | { type: 'REPLACE_SELECTION'; payload: { replacement: string } }
  | { type: 'REPLACE_RANGE'; payload: { from: number; to: number; replacement: string } }
  | { type: 'INSERT_AT_CURSOR'; payload: { text: string } };

export type BridgeResponse =
  | { type: 'PONG'; ready: boolean }
  | { type: 'SELECTION_RESULT'; payload: SelectionRange | null }
  | { type: 'CONTENT_RESULT'; payload: string | null }
  | { type: 'CURRENT_LINE_RESULT'; payload: CurrentLineInfo | null }
  | { type: 'MUTATION_RESULT'; success: boolean; error?: string };
