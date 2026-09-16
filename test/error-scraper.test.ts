import { describe, expect, it } from 'vitest';
import { scrapeOverleafErrors } from '../src/adapters/overleaf/error-scraper';

interface MockElement {
  textContent?: string;
  classList: {
    contains: (cls: string) => boolean;
  };
  children?: MockElement[];
}

interface MockRoot {
  querySelector: (sel: string) => MockElement | null;
  querySelectorAll: (sel: string) => MockElement[];
}

function createMockRoot(options: {
  noPdf?: boolean;
  logEntries?: Array<{ title: string; message: string; isError?: boolean; isWarning?: boolean }>;
  cmDiagnostics?: string[];
  rawLogs?: string;
}): MockRoot {
  return {
    querySelector: (sel: string) => {
      if (options.noPdf && (sel.includes('pdf-error') || sel.includes('alert-danger'))) {
        return {
          textContent: 'No PDF. Emergency stop ./main.tex',
          classList: { contains: (cls: string) => cls === 'alert-danger' || cls === 'pdf-error' },
        };
      }
      if (options.rawLogs && sel.includes('raw-logs')) {
        return {
          textContent: options.rawLogs,
          classList: { contains: () => false },
        };
      }
      return null;
    },
    querySelectorAll: (sel: string) => {
      if (sel.includes('log-entry') || sel.includes('alert-danger')) {
        return (options.logEntries || []).map((e) => ({
          textContent: `${e.title}\n${e.message}`,
          classList: {
            contains: (cls: string) =>
              (e.isError && (cls === 'log-entry-error' || cls === 'alert-danger')) ||
              (e.isWarning && (cls === 'log-entry-warning' || cls === 'alert-warning')),
          },
        }));
      }
      if (sel.includes('cm-diagnostic')) {
        return (options.cmDiagnostics || []).map((d) => ({
          textContent: d,
          classList: { contains: () => false },
        }));
      }
      if (options.noPdf && sel.includes('h1, h2')) {
        return [
          {
            textContent: 'No PDF',
            children: [],
            classList: { contains: () => false },
          },
        ];
      }
      return [];
    },
  };
}

describe('Overleaf Error Scraper', () => {
  it('detects "No PDF" alert banner', () => {
    const mockRoot = createMockRoot({ noPdf: true });
    const result = scrapeOverleafErrors(mockRoot as unknown as Element);

    expect(result.hasNoPdf).toBe(true);
    expect(result.hasErrors).toBe(true);
    expect(result.summary).toContain('No PDF produced');
  });

  it('scrapes log entries with line numbers and file names', () => {
    const mockRoot = createMockRoot({
      logEntries: [
        {
          title: 'Emergency stop. ./main.tex, 3',
          message: 'Fatal error occurred, no output PDF file produced!',
          isError: true,
        },
      ],
    });

    const result = scrapeOverleafErrors(mockRoot as unknown as Element);
    expect(result.hasErrors).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries[0].type).toBe('error');
    expect(result.entries[0].line).toBe(3);
    expect(result.entries[0].file).toBe('./main.tex');
  });

  it('scrapes CodeMirror inline diagnostics', () => {
    const mockRoot = createMockRoot({
      cmDiagnostics: ['Undefined control sequence: \\resumeSubheading'],
    });

    const result = scrapeOverleafErrors(mockRoot as unknown as Element);
    expect(result.hasErrors).toBe(true);
    expect(result.entries.some((e) => e.title.includes('Undefined control sequence'))).toBe(true);
  });

  it('returns clean status when no errors or warnings exist', () => {
    const mockRoot = createMockRoot({});
    const result = scrapeOverleafErrors(mockRoot as unknown as Element);

    expect(result.hasErrors).toBe(false);
    expect(result.hasNoPdf).toBe(false);
    expect(result.entries.length).toBe(0);
    expect(result.summary).toBe('No compiler errors found in Overleaf log panel.');
  });

  it('safely handles undefined document or null root without crashing', () => {
    const result = scrapeOverleafErrors(null);
    expect(result.hasErrors).toBe(false);
    expect(result.hasNoPdf).toBe(false);
    expect(result.entries.length).toBe(0);
  });
});
