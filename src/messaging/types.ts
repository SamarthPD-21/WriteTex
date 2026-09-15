export type AIProviderId = 'gemini' | 'openai' | 'anthropic';

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProviderId;
  description?: string;
  badge?: 'Fast' | 'Best' | 'Latest';
  recommended?: boolean;
}

export interface Settings {
  provider: AIProviderId;
  apiKeys: {
    gemini: string;
    openai: string;
    anthropic: string;
  };
  model: string;
  temperature: number;
  contextScope: 'selection' | 'file';
  autoCollapseOnApply: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
  },
  model: 'gemini-2.5-pro',
  temperature: 0.2,
  contextScope: 'selection',
  autoCollapseOnApply: false,
};

export const AVAILABLE_MODELS: Record<AIProviderId, ModelInfo[]> = {
  gemini: [
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'gemini',
      badge: 'Best',
      recommended: true,
      description: 'Excels at complex academic writing and LaTeX reasoning',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'gemini',
      badge: 'Fast',
      description: 'Ultra-fast latency for real-time phrasing and fixes',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'gemini',
      description: 'Strong foundation model with long context window',
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      badge: 'Best',
      recommended: true,
      description: 'High-capability flagship model for text and math',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      provider: 'openai',
      badge: 'Fast',
      description: 'Lightweight and fast for targeted text edits',
    },
    {
      id: 'o3-mini',
      name: 'o3-mini',
      provider: 'openai',
      badge: 'Latest',
      description: 'Advanced reasoning for technical and mathematical LaTeX',
    },
  ],
  anthropic: [
    {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
      badge: 'Latest',
      recommended: true,
      description: 'Top-tier academic prose quality and LaTeX precision',
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      badge: 'Best',
      description: 'High precision and nuanced academic vocabulary',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      badge: 'Fast',
      description: 'Fast response times for grammar and tone adjustments',
    },
  ],
};

export interface EditorContext {
  selectedText?: string;
  currentFileContent?: string;
  currentFileName?: string;
  cursorPosition?: number;
  selectionFrom?: number;
  selectionTo?: number;
  currentLineNumber?: number;
  currentLineText?: string;
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
  | { type: 'WRITETEX_VALIDATE_KEY'; payload: { provider: AIProviderId; apiKey: string } };

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
