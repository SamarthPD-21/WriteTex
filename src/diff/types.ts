export type DiffChangeType = 'add' | 'delete' | 'unchanged';

export interface DiffWordPart {
  type: DiffChangeType;
  value: string;
}

export interface DiffLine {
  type: DiffChangeType;
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  wordParts?: DiffWordPart[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffResult {
  original: string;
  replacement: string;
  hasChanges: boolean;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  unifiedText: string;
}
