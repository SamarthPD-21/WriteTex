import { EditorAdapter } from '../types';
import { CurrentLineInfo, SelectionRange } from '../../messaging/types';
import { bridgeClient } from '../../content/bridge-client';
import { extractActiveFileName, OVERLEAF_SELECTORS } from './dom-selectors';

export class OverleafAdapter implements EditorAdapter {
  public isActive(): boolean {
    return (
      window.location.hostname.includes('overleaf.com') &&
      Boolean(document.querySelector(OVERLEAF_SELECTORS.cmContent || OVERLEAF_SELECTORS.cmEditor))
    );
  }

  public async waitForEditor(timeoutMs = 15000): Promise<boolean> {
    return bridgeClient.waitForEditor(timeoutMs);
  }

  public async getSelectedText(): Promise<string | null> {
    const sel = await bridgeClient.getSelection();
    if (sel && !sel.empty && sel.text.length > 0) {
      return sel.text;
    }
    // Fallback to native window.getSelection() if bridge hasn't connected
    const fallback = window.getSelection()?.toString() || null;
    return fallback && fallback.trim().length > 0 ? fallback : null;
  }

  public async getSelectionRange(): Promise<SelectionRange | null> {
    return bridgeClient.getSelection();
  }

  public async getCurrentFileContent(): Promise<string | null> {
    return bridgeClient.getContent();
  }

  public getCurrentFileName(): string | null {
    return extractActiveFileName();
  }

  public async getCurrentLine(): Promise<CurrentLineInfo | null> {
    return bridgeClient.getCurrentLine();
  }

  public async replaceSelection(replacement: string): Promise<boolean> {
    return bridgeClient.replaceSelection(replacement);
  }

  public async replaceRange(from: number, to: number, replacement: string): Promise<boolean> {
    return bridgeClient.replaceRange(from, to, replacement);
  }

  public async insertAtCursor(text: string): Promise<boolean> {
    return bridgeClient.insertAtCursor(text);
  }

  public onSelectionChange(callback: (selectedText: string) => void): () => void {
    let debounceTimer: ReturnType<typeof setTimeout>;

    const handler = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const text = await this.getSelectedText();
        callback(text || '');
      }, 120);
    };

    document.addEventListener('selectionchange', handler);

    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener('selectionchange', handler);
    };
  }
}

export const overleafAdapter = new OverleafAdapter();
