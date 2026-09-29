/**
 * PDF text extraction, built as a separate module (dist/pdf-extractor.js) and
 * loaded on demand: pdf.js is ~2.4 MB and most sessions never attach a PDF.
 */
import { getDocumentProxy, extractText } from 'unpdf';

export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: true });
  const text = typeof result.text === 'string' ? result.text : (result.text as string[]).join('\n');
  return { text, pageCount: pdf.numPages };
}
