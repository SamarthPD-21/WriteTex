import { getDocumentProxy, extractText } from 'unpdf';
import { FileAttachment, FileExtractionResult, SupportedFileType } from './types';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit

/**
 * Formats byte size into a concise human-readable string (e.g. "12.4 KB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determines file type from filename extension.
 */
export function detectFileType(fileName: string): SupportedFileType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.txt')) return 'txt';
  if (lower.endsWith('.md')) return 'md';
  if (lower.endsWith('.tex')) return 'tex';
  return 'other';
}

/**
 * Heuristic to detect whether the file contents or filename match a job description.
 */
export function isJobDescriptionContent(text: string, fileName: string): boolean {
  const fnLower = fileName.toLowerCase();
  if (fnLower.includes('jd') || fnLower.includes('job') || fnLower.includes('role') || fnLower.includes('description')) {
    return true;
  }

  const textLower = text.toLowerCase().slice(0, 3000);
  const jdKeywords = [
    'responsibilities',
    'requirements',
    'qualifications',
    'job description',
    'about the role',
    'what you will do',
    'who you are',
    'preferred qualifications',
    'minimum qualifications',
    'experience required',
  ];

  let matches = 0;
  for (const kw of jdKeywords) {
    if (textLower.includes(kw)) matches++;
  }

  return matches >= 2;
}

/**
 * Cleans extracted text to avoid runaway whitespace or non-printable artifacts.
 */
export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts clean text content and metadata from a user-uploaded File (.txt, .pdf, .md, .tex).
 */
export async function extractTextFromFile(file: File): Promise<FileExtractionResult> {
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the 15MB limit. Please upload a smaller document.`,
    };
  }

  const fileType = detectFileType(file.name);
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    let extractedText = '';
    let pageCount: number | undefined;

    if (fileType === 'pdf') {
      const buffer = await file.arrayBuffer();
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      pageCount = pdf.numPages;

      const result = await extractText(pdf, { mergePages: true });
      extractedText = cleanExtractedText(typeof result.text === 'string' ? result.text : (result.text as string[]).join('\n'));

      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          error: `"${file.name}" has no selectable text. It may be a scanned image or protected PDF.`,
        };
      }
    } else {
      // Plain text formats (.txt, .md, .tex, etc.)
      const rawText = await file.text();
      extractedText = cleanExtractedText(rawText);

      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          error: `"${file.name}" is empty.`,
        };
      }
    }

    const charCount = extractedText.length;
    const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;
    const isJd = isJobDescriptionContent(extractedText, file.name);

    const attachment: FileAttachment = {
      id,
      name: file.name,
      type: fileType,
      size: file.size,
      formattedSize: formatFileSize(file.size),
      text: extractedText,
      pageCount,
      charCount,
      wordCount,
      extractedAt: Date.now(),
      isJobDescriptionCandidate: isJd,
    };

    return {
      success: true,
      attachment,
    };
  } catch (err: any) {
    const message = err?.message || 'Failed to read file';
    return {
      success: false,
      error: `Could not parse "${file.name}": ${message}`,
    };
  }
}
