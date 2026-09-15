import { SelectionRange, CurrentLineInfo } from '../messaging/types';

export interface EditorAdapter {
  /**
   * Returns whether the editor is currently detected on the page
   */
  isActive(): boolean;

  /**
   * Waits for the editor to be mounted and ready
   */
  waitForEditor(timeoutMs?: number): Promise<boolean>;

  /**
   * Returns the currently selected text, if any
   */
  getSelectedText(): Promise<string | null>;

  /**
   * Returns full selection coordinates and text
   */
  getSelectionRange(): Promise<SelectionRange | null>;

  /**
   * Returns full file content of active editor
   */
  getCurrentFileContent(): Promise<string | null>;

  /**
   * Returns current active file name (e.g. main.tex, methodology.tex)
   */
  getCurrentFileName(): string | null;

  /**
   * Returns current cursor line information
   */
  getCurrentLine(): Promise<CurrentLineInfo | null>;

  /**
   * Replaces current selection with new text
   */
  replaceSelection(replacement: string): Promise<boolean>;

  /**
   * Replaces an exact character range [from, to] with new text
   */
  replaceRange(from: number, to: number, replacement: string): Promise<boolean>;

  /**
   * Inserts text at the cursor position
   */
  insertAtCursor(text: string): Promise<boolean>;

  /**
   * Listeners
   */
  onSelectionChange(callback: (selectedText: string) => void): () => void;
}
