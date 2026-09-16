export type SupportedFileType = 'txt' | 'pdf' | 'md' | 'tex' | 'other';

export interface FileAttachment {
  id: string;
  name: string;
  type: SupportedFileType;
  size: number;
  formattedSize: string;
  text: string;
  pageCount?: number;
  charCount: number;
  wordCount: number;
  extractedAt: number;
  isJobDescriptionCandidate?: boolean;
}

export interface FileExtractionResult {
  success: boolean;
  attachment?: FileAttachment;
  error?: string;
}
