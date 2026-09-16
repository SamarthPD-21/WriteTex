/**
 * Overleaf Compilation Error Scraper
 * Extracts live LaTeX compilation errors, warnings, and log messages directly from Overleaf's DOM.
 */

export interface OverleafLogEntry {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  file?: string;
  line?: number;
  raw?: string;
}

export interface OverleafDiagnosticsResult {
  hasErrors: boolean;
  hasNoPdf: boolean;
  entries: OverleafLogEntry[];
  summary: string;
}

/**
 * Scrapes the Overleaf DOM for active compilation errors and log entries.
 */
export function scrapeOverleafErrors(rootNode?: Document | Element | null): OverleafDiagnosticsResult {
  const root = rootNode !== undefined ? rootNode : (typeof document !== 'undefined' ? document : null);
  if (!root) {
    return {
      hasErrors: false,
      hasNoPdf: false,
      entries: [],
      summary: 'No compiler errors found in Overleaf log panel.',
    };
  }

  const entries: OverleafLogEntry[] = [];
  let hasNoPdf = false;

  // 1. Check for prominent "No PDF" status
  const noPdfIndicators = [
    root.querySelector('.pdf-error'),
    root.querySelector('[class*="no-pdf"]'),
    root.querySelector('.alert-danger'),
  ];

  for (const el of noPdfIndicators) {
    if (el && el.textContent && /no pdf/i.test(el.textContent)) {
      hasNoPdf = true;
      break;
    }
  }

  // Also check if any element with text "No PDF" exists on page
  if (!hasNoPdf) {
    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, div, span'));
    for (const h of headings) {
      if (h.children.length === 0 && h.textContent?.trim() === 'No PDF') {
        hasNoPdf = true;
        break;
      }
    }
  }

  // 2. Scrape structured log entries from Overleaf's logs panel
  const entrySelectors = [
    '.log-entry',
    '[class*="log-entry"]',
    '[class*="log-item"]',
    '[data-testid*="log-entry"]',
    '[data-testid*="log-item"]',
    '.alert-danger',
  ];

  const processedTexts = new Set<string>();

  for (const sel of entrySelectors) {
    const elements = Array.from(root.querySelectorAll(sel));
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (!text || processedTexts.has(text) || text.length > 800) continue;
      processedTexts.add(text);

      const isError =
        el.classList.contains('log-entry-error') ||
        el.classList.contains('alert-danger') ||
        /error|emergency stop|undefined control sequence|runaway argument|fatal error|missing \\begin/i.test(text);

      const isWarning =
        el.classList.contains('log-entry-warning') ||
        el.classList.contains('alert-warning') ||
        /warning|overfull|underfull/i.test(text);

      // Extract line number if mentioned (e.g. "./main.tex, 16" or "at lines 115--115" or "line 42")
      let lineNum: number | undefined;
      const lineMatch = text.match(/(?:line|lines|\.\/[a-zA-Z0-9._-]+,\s*)\s*(\d+)/i);
      if (lineMatch) {
        lineNum = parseInt(lineMatch[1], 10);
      }

      // Extract file name
      let fileName: string | undefined;
      const fileMatch = text.match(/(\.\/[a-zA-Z0-9._-]+\.tex|[a-zA-Z0-9._-]+\.tex)/i);
      if (fileMatch) {
        fileName = fileMatch[1];
      }

      // Extract title and body message
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const title = lines[0] || text.slice(0, 80);
      const message = lines.slice(1).join(' ') || title;

      entries.push({
        type: isError ? 'error' : isWarning ? 'warning' : 'info',
        title,
        message,
        file: fileName,
        line: lineNum,
        raw: text,
      });
    }
  }

  // 3. Check CodeMirror 6 inline lint tooltips and diagnostics
  const cmDiagnostics = Array.from(
    root.querySelectorAll('.cm-diagnostic, .cm-lint-point, .cm-tooltip-lint')
  );
  for (const diag of cmDiagnostics) {
    const text = diag.textContent?.trim();
    if (text && !processedTexts.has(text)) {
      processedTexts.add(text);
      entries.push({
        type: 'error',
        title: text.split('\n')[0] || text,
        message: text,
      });
    }
  }

  // 4. Check raw logs pre if available
  const rawLogsPre = root.querySelector('pre.raw-logs, pre[class*="raw-log"]');
  if (rawLogsPre && rawLogsPre.textContent) {
    const rawText = rawLogsPre.textContent;
    const errorBlocks = rawText.match(/!(?:[^\n]+\n){1,6}/g);
    if (errorBlocks) {
      for (const block of errorBlocks.slice(0, 5)) {
        const cleanBlock = block.trim();
        if (!processedTexts.has(cleanBlock)) {
          processedTexts.add(cleanBlock);
          entries.push({
            type: 'error',
            title: cleanBlock.split('\n')[0].replace(/^!\s*/, ''),
            message: cleanBlock,
          });
        }
      }
    }
  }

  const errorCount = entries.filter((e) => e.type === 'error').length;
  const warnCount = entries.filter((e) => e.type === 'warning').length;

  let summary = '';
  if (hasNoPdf || errorCount > 0) {
    summary = `LaTeX Compilation Failed: ${hasNoPdf ? 'No PDF produced. ' : ''}${errorCount} error(s), ${warnCount} warning(s).`;
  } else if (warnCount > 0) {
    summary = `${warnCount} LaTeX warning(s) detected.`;
  } else {
    summary = 'No compiler errors found in Overleaf log panel.';
  }

  return {
    hasErrors: hasNoPdf || errorCount > 0,
    hasNoPdf,
    entries,
    summary,
  };
}
