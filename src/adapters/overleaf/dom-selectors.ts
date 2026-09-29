export const OVERLEAF_SELECTORS = {
  // CodeMirror 6 elements
  cmEditor: '.cm-editor',
  cmContent: '.cm-content',
  cmActiveLine: '.cm-activeLine',
  cmScroller: '.cm-scroller',
  cmLine: '.cm-line',

  // Overleaf IDE layout elements
  ideBody: '#ide-body, .ide-editor-container, .editor-container',
  toolbar: '.toolbar-editor, .ide-toolbar',
  fileTree: '.file-tree-list, .file-tree',
  activeFile:
    '.file-tree-list .entity.selected .entity-name, .file-tree-list .selected .name, .file-tree .active .name',
  fileEntity: '.entity-name',
  recompileBtn: '[data-testid="recompile-button"], button.btn-recompile',

  // Fallbacks
  contentFallback: '[contenteditable="true"]',
  editorFallback: '[class*="cm-editor"]',
} as const;

/**
 * Extracts current active file name from Overleaf file tree or header tabs
 */
export function extractActiveFileName(): string | null {
  const clean = (text: string | null | undefined) =>
    (text || '').replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();

  // Current Overleaf: the selected file-tree item carries the file name in aria-label
  const treeItem = document.querySelector('li[role="treeitem"][aria-selected="true"]');
  const treeName = clean(treeItem?.getAttribute('aria-label'));
  if (/\.[A-Za-z0-9]+$/.test(treeName)) return treeName;

  // The active editor tab, without its icon ligatures ("description", "close")
  for (const tab of Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]'))) {
    const clone = tab.cloneNode(true) as Element;
    clone.querySelectorAll('.material-symbols, [class*="material-symbols"], button').forEach((n) => n.remove());
    const name = clean(clone.textContent);
    if (/^[^\s/]+\.[A-Za-z0-9]+$/.test(name)) return name;
  }

  // Try 1: Selected file item in left sidebar tree
  const activeTreeItem = document.querySelector(OVERLEAF_SELECTORS.activeFile);
  if (activeTreeItem && activeTreeItem.textContent) {
    return activeTreeItem.textContent.trim();
  }

  // Try 2: Breadcrumb or toolbar title if available
  const tabHeader = document.querySelector('.toolbar-header .file-name, .editor-tab.active');
  if (tabHeader && tabHeader.textContent) {
    return tabHeader.textContent.trim();
  }

  // Try 3: Search entity name inside selected class
  const selectedEntity = document.querySelector('.entity.selected, .tree-item.selected');
  if (selectedEntity) {
    const nameEl = selectedEntity.querySelector('.entity-name, .name');
    if (nameEl && nameEl.textContent) {
      return nameEl.textContent.trim();
    }
  }

  return 'main.tex';
}
