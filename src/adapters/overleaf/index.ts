import { EditorAdapter } from '../types';
import { CurrentLineInfo, EditOutcome, EditorSnapshot, SelectionRange } from '../../messaging/types';
import { bridgeClient } from '../../content/bridge-client';
import { isOverleafProjectUrl } from '../../shared/overleaf-url';
import { extractActiveFileName, OVERLEAF_SELECTORS } from './dom-selectors';

export class OverleafAdapter implements EditorAdapter {
  public isActive(): boolean {
    return (
      isOverleafProjectUrl(window.location.href) &&
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

  public async getSnapshot(): Promise<EditorSnapshot | null> {
    return bridgeClient.getSnapshot();
  }

  public async applyEdit(from: number, to: number, replacement: string, expected: string): Promise<EditOutcome> {
    return bridgeClient.applyEdit(from, to, replacement, expected);
  }

  /** Current Overleaf project id, used to keep per-project workspace state. */
  public getProjectId(): string {
    return window.location.pathname.match(/\/(?:project|read)\/([^/?#]+)/)?.[1] || 'default';
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

  /**
   * Calls back with a fresh editor snapshot whenever the selection settles.
   * One bridge round-trip per change (selection, cursor line, and doc length together).
   */
  public onSnapshotChange(callback: (snapshot: EditorSnapshot | null) => void): () => void {
    let debounceTimer: ReturnType<typeof setTimeout>;

    const handler = (event?: Event) => {
      // Typing in the WriteTex panel itself is not an editor selection change
      const path = event?.composedPath?.() || [];
      if (path.some((node) => (node as Element).id === 'writetex-extension-root')) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          callback(await this.getSnapshot());
        } catch {
          // Bridge not ready yet
        }
      }, 120);
    };

    document.addEventListener('selectionchange', handler);
    // CM6 keyboard navigation does not always fire selectionchange
    document.addEventListener('keyup', handler, true);
    document.addEventListener('mouseup', handler, true);

    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener('selectionchange', handler);
      document.removeEventListener('keyup', handler, true);
      document.removeEventListener('mouseup', handler, true);
    };
  }

  public onSelectionChange(callback: (selectedText: string) => void): () => void {
    return this.onSnapshotChange((snapshot) => {
      callback(snapshot && !snapshot.selection.empty ? snapshot.selection.text : '');
    });
  }
}

export const overleafAdapter = new OverleafAdapter();
