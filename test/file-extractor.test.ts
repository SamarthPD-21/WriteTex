import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  detectFileType,
  isJobDescriptionContent,
  cleanExtractedText,
  extractTextFromFile,
} from '../src/integrations/files/extractor';
import { FileAttachment } from '../src/integrations/files/types';
import { buildPrompt } from '../src/prompts/builder';
import { EditorContext } from '../src/messaging/types';

describe('File Extractor & Formatter', () => {
  it('formats file sizes accurately', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('detects file types correctly from extensions', () => {
    expect(detectFileType('resume.pdf')).toBe('pdf');
    expect(detectFileType('notes.TXT')).toBe('txt');
    expect(detectFileType('README.MD')).toBe('md');
    expect(detectFileType('paper.tex')).toBe('tex');
    expect(detectFileType('data.csv')).toBe('other');
  });

  it('detects job description content heuristically', () => {
    expect(isJobDescriptionContent('random notes', 'senior_software_engineer_jd.pdf')).toBe(true);
    expect(isJobDescriptionContent('Core responsibilities include leading migrations. Minimum qualifications include 5 years in Rust.', 'document.pdf')).toBe(true);
    expect(isJobDescriptionContent('Today we went to the market and bought apples.', 'notes.txt')).toBe(false);
  });

  it('cleans extracted text appropriately', () => {
    const raw = 'Line 1\r\n\r\n\r\n\r\nLine 2   with   spaces';
    const cleaned = cleanExtractedText(raw);
    expect(cleaned).toBe('Line 1\n\nLine 2 with spaces');
  });

  it('extracts plain text files properly', async () => {
    const fakeFile = new File(['Hello WriteTex!\nThis is a test document.'], 'test.txt', {
      type: 'text/plain',
    });

    const res = await extractTextFromFile(fakeFile);
    expect(res.success).toBe(true);
    expect(res.attachment).toBeDefined();
    expect(res.attachment?.name).toBe('test.txt');
    expect(res.attachment?.type).toBe('txt');
    expect(res.attachment?.text).toContain('Hello WriteTex!');
    expect(res.attachment?.charCount).toBeGreaterThan(10);
    expect(res.attachment?.wordCount).toBe(7);
  });

  it('rejects empty text files', async () => {
    const emptyFile = new File(['   '], 'empty.txt', { type: 'text/plain' });
    const res = await extractTextFromFile(emptyFile);
    expect(res.success).toBe(false);
    expect(res.error).toContain('is empty');
  });
});

describe('Prompt Builder Integration with Attached Files', () => {
  it('includes [ATTACHED REFERENCE DOCUMENTS] block when files are attached', () => {
    const mockFile: FileAttachment = {
      id: 'file_1',
      name: 'staff_eng_jd.pdf',
      type: 'pdf',
      size: 15360,
      formattedSize: '15.0 KB',
      text: 'Must have experience with Kubernetes, Go, and low-latency distributed systems.',
      pageCount: 2,
      charCount: 78,
      wordCount: 10,
      extractedAt: Date.now(),
      isJobDescriptionCandidate: true,
    };

    const context: EditorContext = {
      selectedText: '\\resumeItem{Worked on backend systems}',
      currentFileName: 'resume.tex',
      attachedFiles: [mockFile],
    };

    const prompt = buildPrompt('Tailor my bullet point according to the attached JD', context);

    expect(prompt.userPrompt).toContain('[ATTACHED REFERENCE DOCUMENTS]');
    expect(prompt.userPrompt).toContain('staff_eng_jd.pdf (2 pages, 15.0 KB)');
    expect(prompt.userPrompt).toContain('Kubernetes, Go, and low-latency distributed systems');
    expect(prompt.userPrompt).toContain('[SELECTED LATEX CODE]');
  });

  it('handles multiple attached files without collision', () => {
    const file1: FileAttachment = {
      id: 'f1',
      name: 'notes.txt',
      type: 'txt',
      size: 1024,
      formattedSize: '1.0 KB',
      text: 'Reduced latency by 45ms using Redis caching.',
      charCount: 44,
      wordCount: 7,
      extractedAt: Date.now(),
    };

    const file2: FileAttachment = {
      id: 'f2',
      name: 'requirements.pdf',
      type: 'pdf',
      size: 2048,
      formattedSize: '2.0 KB',
      text: 'Looking for proven optimization metrics.',
      pageCount: 1,
      charCount: 39,
      wordCount: 5,
      extractedAt: Date.now(),
    };

    const context: EditorContext = {
      selectedText: '\\resumeItem{Optimized cache layer}',
      currentFileName: 'resume.tex',
      attachedFiles: [file1, file2],
    };

    const prompt = buildPrompt('Incorporate metrics', context);

    expect(prompt.userPrompt).toContain('The user has attached 2 document(s) for reference:');
    expect(prompt.userPrompt).toContain('notes.txt');
    expect(prompt.userPrompt).toContain('requirements.pdf');
    expect(prompt.userPrompt).toContain('Reduced latency by 45ms');
    expect(prompt.userPrompt).toContain('Looking for proven optimization metrics');
  });
});
