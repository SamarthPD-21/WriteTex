import React, { useState, useEffect, useCallback } from 'react';
import { FloatingButton } from './components/FloatingButton';
import { Panel } from './components/Panel';
import { ChatInput, HistoryItem } from './components/ChatInput';
import { StreamingView } from './components/StreamingView';
import { DiffView } from './components/DiffView';
import { EditView } from './components/EditView';
import { SettingsView } from './components/SettingsView';
import { Toast, ToastMessage, ToastAction } from './components/Toast';
import { ShortcutsModal } from './components/ShortcutsModal';
import { TemplateLibraryModal } from './components/TemplateLibraryModal';
import { useEditor } from './hooks/useEditor';
import { useSettings } from './hooks/useSettings';
import { useAI } from './hooks/useAI';
import { usePanelPosition } from './hooks/usePanelPosition';
import { usePanelResize } from './hooks/usePanelResize';
import { locateWrongSnippetInDoc } from '../diff/smart-replace';
import { validateLatex } from '../latex/validator';
import { autoRepairLatexDocument } from '../latex/auto-repair';
import { DiffResult } from '../diff/types';
import { isExtensionContextValid } from '../messaging/runtime';
import {
  AVAILABLE_MODELS,
  DocumentMode,
} from '../messaging/types';
import { GitHubAnalysisResult } from '../integrations/github/types';
import { RefreshCw } from 'lucide-react';

export type AppView = 'input' | 'streaming' | 'diff' | 'edit' | 'settings';

interface UndoEntry {
  id: string;
  from: number;
  to: number;
  previousText: string;
  replacementText: string;
  fileName: string;
  timestamp: number;
  description: string;
}

export const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<AppView>('input');
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [lastMeta, setLastMeta] = useState<{
    docMode?: DocumentMode;
    targetCompany?: string;
    targetRole?: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isContextInvalidated, setIsContextInvalidated] = useState<boolean>(!isExtensionContextValid());
  const [fullDocContent, setFullDocContent] = useState<string>('');

  // Modals
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);

  // Multi-level undo stack (up to 10 edits)
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const {
    isEditorReady,
    selectedText,
    currentFileName,
    selectionRange,
    currentLine,
    getFullContent,
    replaceRange,
  } = useEditor();

  const {
    settings,
    updateSettings,
    validateKey,
    isValidating,
  } = useSettings();

  const {
    status: aiStatus,
    streamedText,
    diffResult,
    error: aiError,
    generate,
    stop,
    reset,
    setDiffResult,
  } = useAI(settings);

  const { position, handleMouseDown } = usePanelPosition();
  const { width: panelWidth, handleMouseDownResize } = usePanelResize();

  const addToast = useCallback((type: ToastMessage['type'], text: string, action?: ToastAction) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text, action }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, action ? 8000 : 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch full document content when panel opens or selection changes
  useEffect(() => {
    if (isOpen) {
      getFullContent().then((content) => {
        if (content) setFullDocContent(content);
      });
    }
  }, [isOpen, selectedText, getFullContent]);

  // Auto-migrate away from deprecated or slow models on load
  useEffect(() => {
    if (
      !settings.model ||
      settings.model === 'gemini-2.5-pro' ||
      settings.model === 'gemini-3.1-pro-preview' ||
      settings.model.startsWith('models/')
    ) {
      updateSettings({ model: 'gemini-3.8-flash' });
    }
  }, [settings.model, updateSettings]);

  // Record completed responses into history
  useEffect(() => {
    if (aiStatus === 'done' && streamedText) {
      setHistory((prev) => [
        ...prev,
        {
          id: `hist_${Date.now()}`,
          userPrompt: lastPrompt,
          docMode: lastMeta?.docMode,
          targetCompany: lastMeta?.targetCompany,
          targetRole: lastMeta?.targetRole,
          response: streamedText,
          diffResult,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [aiStatus, streamedText, lastPrompt, diffResult, lastMeta]);

  // Listen for global shortcut message from service worker
  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg?.type === 'WRITETEX_TOGGLE_PANEL') {
        setIsOpen((prev) => !prev);
      }
    };
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, []);

  // Handle in-page keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        } else if (isTemplatesOpen) {
          setIsTemplatesOpen(false);
        } else if (isOpen) {
          if (activeView === 'settings') {
            setActiveView('input');
          } else if (activeView === 'edit') {
            setActiveView('diff');
          } else if (activeView === 'streaming') {
            handleStop();
          } else {
            setIsOpen(false);
          }
        }
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) && isOpen) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeView, isShortcutsOpen, isTemplatesOpen]);

  // Sync AI state with active view & handle smart error recovery
  useEffect(() => {
    if (aiStatus === 'streaming') {
      setActiveView('streaming');
    } else if (aiStatus === 'done') {
      if (diffResult && diffResult.hasChanges) {
        setActiveView('diff');
      } else {
        setActiveView('input');
      }
    } else if (aiStatus === 'idle') {
      if (activeView === 'streaming') {
        setActiveView('input');
      }
    } else if (aiStatus === 'error') {
      if (aiError) {
        if (
          aiError.includes('Extension updated') ||
          aiError.includes('Extension context invalidated')
        ) {
          setIsContextInvalidated(true);
          addToast(
            'warning',
            'Extension updated in Chrome. Please refresh this tab (Ctrl+R / F5) to reconnect.',
            {
              label: '🔄 Refresh Tab',
              onClick: () => window.location.reload(),
            }
          );
        } else if (
          aiError.includes('gemini-2.5-pro') ||
          aiError.includes('gemini-3.1-pro-preview') ||
          aiError.includes('no longer available')
        ) {
          addToast('error', aiError, {
            label: 'Switch to Gemini 3.8 Flash (Ultra-fast)',
            onClick: () => {
              updateSettings({ provider: 'gemini', model: 'gemini-3.8-flash' });
            },
          });
        } else if (aiError.toLowerCase().includes('api key')) {
          addToast('error', aiError, {
            label: 'Open Settings',
            onClick: () => setActiveView('settings'),
          });
        } else {
          addToast('error', aiError);
        }
      }
      setActiveView('input');
    }
  }, [aiStatus, diffResult, aiError, addToast, updateSettings]);

  const handleStop = () => {
    stop();
    setActiveView('input');
    addToast('info', 'Generation stopped.');
  };

  const [pendingEdit, setPendingEdit] = useState<{
    from: number;
    to: number;
    text: string;
    fileName: string;
  } | null>(null);

  const pushUndo = (entry: UndoEntry) => {
    setUndoStack((prev) => [entry, ...prev].slice(0, 10));
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const [latest, ...rest] = undoStack;

    try {
      const ok = await replaceRange(latest.from, latest.to, latest.previousText);
      if (ok) {
        setUndoStack(rest);
        addToast('info', `↩ Undid: ${latest.description}`);
      } else {
        addToast('error', 'Could not revert automatically; please use Ctrl+Z in Overleaf.');
      }
    } catch {
      addToast('error', 'Revert failed; use Ctrl+Z in Overleaf.');
    }
  };

  const handleGenerate = async (
    prompt: string,
    presetKey?: string,
    meta?: {
      docMode?: DocumentMode;
      targetCompany?: string;
      targetRole?: string;
      jobDescription?: string;
      githubAnalysis?: GitHubAnalysisResult;
    }
  ) => {
    setLastPrompt(prompt);
    setLastMeta(
      meta
        ? {
            docMode: meta.docMode,
            targetCompany: meta.targetCompany,
            targetRole: meta.targetRole,
          }
        : null
    );

    // Snapshot the exact target selection at generation trigger time
    if (selectionRange && !selectionRange.empty) {
      setPendingEdit({
        from: selectionRange.from,
        to: selectionRange.to,
        text: selectedText || selectionRange.text,
        fileName: currentFileName,
      });
    } else if (selectedText && selectedText.trim().length > 0) {
      setPendingEdit({
        from: currentLine?.from ?? 0,
        to: (currentLine?.from ?? 0) + selectedText.length,
        text: selectedText,
        fileName: currentFileName,
      });
    } else {
      setPendingEdit(null);
    }

    const fullDoc = await getFullContent();
    if (fullDoc) setFullDocContent(fullDoc);

    generate(
      prompt,
      {
        selectedText: selectedText || undefined,
        currentFileContent: fullDoc || undefined,
        currentFileName,
        currentLineNumber: currentLine?.number,
        currentLineText: currentLine?.text,
        docMode: meta?.docMode,
        targetCompany: meta?.targetCompany,
        targetRole: meta?.targetRole,
        jobDescription: meta?.jobDescription,
        githubAnalysis: meta?.githubAnalysis,
      },
      presetKey
    );
  };

  /**
   * TRANSACTIONAL APPLICATION OF EDITS DIRECTLY INTO OVERLEAF
   * Strictly selection-locked: NEVER corrupts or modifies unrelated document code.
   */
  const handleApplyChanges = async (
    overrideReplacement?: string,
    targetOriginal?: string
  ) => {
    const replacement = overrideReplacement || diffResult?.replacement;
    if (!replacement) return;

    setIsApplying(true);

    try {
      const fullDoc = await getFullContent();
      if (!fullDoc) {
        addToast('error', 'Could not access document content in Overleaf.');
        return;
      }
      setFullDocContent(fullDoc);

      // Guard: Check basic LaTeX syntax before applying
      const syntaxCheck = validateLatex(replacement);
      if (!syntaxCheck.valid && syntaxCheck.errors.length > 0) {
        addToast('warning', `Notice: ${syntaxCheck.errors[0]}`);
      }

      let applied = false;
      let previousOriginalText = '';
      let appliedFrom = -1;
      let appliedTo = -1;
      let appliedActionDesc = 'Replaced snippet';

      // Priority 1: Exact coordinates captured when generation was triggered
      if (pendingEdit && fullDoc && pendingEdit.fileName === currentFileName) {
        const slice = fullDoc.slice(pendingEdit.from, pendingEdit.to);
        if (slice === pendingEdit.text) {
          applied = await replaceRange(pendingEdit.from, pendingEdit.to, replacement);
          if (applied) {
            appliedFrom = pendingEdit.from;
            appliedTo = pendingEdit.from + replacement.length;
            previousOriginalText = pendingEdit.text;
            appliedActionDesc = 'Replaced selected snippet';
          }
        }
      }

      // Priority 2: Intelligent Smart Replacement locator (locates the exact wrong snippet in fullDoc)
      if (!applied) {
        const loc = locateWrongSnippetInDoc(fullDoc, replacement, {
          originalSnippet: targetOriginal || diffResult?.original || pendingEdit?.text || selectedText,
          approximateIndex: pendingEdit?.from ?? currentLine?.from,
          activeSelection: selectionRange && !selectionRange.empty ? selectionRange : undefined,
        });

        if (loc) {
          applied = await replaceRange(loc.from, loc.to, replacement);
          if (applied) {
            appliedFrom = loc.from;
            appliedTo = loc.from + replacement.length;
            previousOriginalText = loc.matchedText;
            appliedActionDesc =
              loc.reason === 'section_match'
                ? 'Replaced matching section'
                : loc.reason === 'content_anchor'
                ? 'Replaced matching code block'
                : loc.reason === 'preamble'
                ? 'Restored complete preamble'
                : loc.reason === 'bullet_match'
                ? 'Replaced matching bullets'
                : 'Replaced selected snippet';
          }
        }
      }

      if (applied) {
        if (appliedFrom !== -1 && previousOriginalText !== undefined) {
          pushUndo({
            id: `undo_${Date.now()}`,
            from: appliedFrom,
            to: appliedTo,
            previousText: previousOriginalText,
            replacementText: replacement,
            fileName: currentFileName,
            timestamp: Date.now(),
            description: appliedActionDesc,
          });
        }

        addToast('success', `✓ ${appliedActionDesc} in ${currentFileName}`, {
          label: '↩ Undo',
          onClick: () => handleUndo(),
        });

        reset();
        setActiveView('input');
        setPendingEdit(null);

        if (settings.autoCollapseOnApply) {
          setIsOpen(false);
        }
      } else {
        addToast(
          'warning',
          'Could not automatically detect the matching snippet to replace. Please highlight the wrong code in Overleaf and click Apply.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', `Error applying replacement: ${msg}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleAutoRepairDocument = async () => {
    setIsApplying(true);
    try {
      const fullDoc = await getFullContent();
      if (!fullDoc) {
        addToast('error', 'Could not access document content in Overleaf.');
        return;
      }
      setFullDocContent(fullDoc);

      const repairResult = autoRepairLatexDocument(fullDoc);
      if (!repairResult.wasRepaired) {
        addToast('info', 'No corrupted macros or missing preamble detected in this document.');
        return;
      }

      const ok = await replaceRange(0, fullDoc.length, repairResult.repairedDoc);
      if (ok) {
        pushUndo({
          id: `undo_${Date.now()}`,
          from: 0,
          to: repairResult.repairedDoc.length,
          previousText: fullDoc,
          replacementText: repairResult.repairedDoc,
          fileName: currentFileName,
          timestamp: Date.now(),
          description: 'Repaired LaTeX macros & preamble',
        });

        const fixesSummary = repairResult.repairsMade.slice(0, 3).join(', ');
        addToast('success', `✓ Repaired LaTeX document (${fixesSummary})`, {
          label: '↩ Undo',
          onClick: () => handleUndo(),
        });
      } else {
        addToast('error', 'Failed to update document in Overleaf.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', `Repair failed: ${msg}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleInsertTemplate = async (templateLatex: string) => {
    try {
      const fullDoc = await getFullContent();
      const targetFrom = selectionRange && !selectionRange.empty ? selectionRange.from : 0;
      const targetTo = selectionRange && !selectionRange.empty ? selectionRange.to : (fullDoc?.length ?? 0);
      const prev = fullDoc ? fullDoc.slice(targetFrom, targetTo) : '';

      const ok = await replaceRange(targetFrom, targetTo, templateLatex);
      if (ok) {
        pushUndo({
          id: `undo_${Date.now()}`,
          from: targetFrom,
          to: targetFrom + templateLatex.length,
          previousText: prev,
          replacementText: templateLatex,
          fileName: currentFileName,
          timestamp: Date.now(),
          description: 'Inserted LaTeX template',
        });

        addToast('success', `✓ Inserted template into ${currentFileName}`, {
          label: '↩ Undo',
          onClick: () => handleUndo(),
        });
      } else {
        addToast('error', 'Failed to insert template into Overleaf.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', `Template insertion failed: ${msg}`);
    }
  };

  return (
    <div className="writetex-root-container">
      {/* 1. Subtle Floating Pill (FAB) */}
      <FloatingButton
        isOpen={isOpen}
        hasSelection={Boolean(selectedText && selectedText.trim().length > 0)}
        onClick={() => setIsOpen(true)}
      />

      {/* 2. Floating AI Assistant Panel */}
      <Panel
        isOpen={isOpen}
        position={position}
        width={panelWidth}
        onMouseDownHeader={handleMouseDown}
        onMouseDownResize={handleMouseDownResize}
        isSettingsOpen={activeView === 'settings'}
        onToggleSettings={() => setActiveView(activeView === 'settings' ? 'input' : 'settings')}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        undoCount={undoStack.length}
        onUndo={handleUndo}
        onMinimize={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
        isEditorConnected={isEditorReady}
      >
        <Toast toasts={toasts} onDismiss={dismissToast} />

        {isContextInvalidated && (
          <div className="flex items-center justify-between p-2.5 mx-3 mt-2 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs shadow-md animate-panel-in">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
              <span className="font-medium leading-tight">Extension reloaded. Refresh tab to reconnect.</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-semibold transition-colors shrink-0 active:scale-95"
            >
              Refresh
            </button>
          </div>
        )}

        {activeView === 'input' && (
          <ChatInput
            selectedText={selectedText}
            currentFileName={currentFileName}
            currentFileContent={fullDocContent}
            settings={settings}
            onUpdateModel={(provider, model) => {
              updateSettings({ provider, model });
              const info = AVAILABLE_MODELS[provider]?.find((m) => m.id === model);
              addToast('info', `Switched to ${info?.name || model}`);
            }}
            onGenerate={handleGenerate}
            isGenerating={aiStatus === 'streaming'}
            onStop={handleStop}
            onOpenSettings={() => setActiveView('settings')}
            history={history}
            onViewDiff={(diff: DiffResult) => {
              setDiffResult(diff);
              setActiveView('diff');
            }}
            onApplyDirect={(text: string, original?: string) => handleApplyChanges(text, original)}
            onAutoRepair={handleAutoRepairDocument}
            onClearHistory={() => setHistory([])}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
          />
        )}

        {activeView === 'streaming' && (
          <StreamingView
            currentFileName={currentFileName}
            userPrompt={lastPrompt}
            streamedText={streamedText}
            onStop={handleStop}
          />
        )}

        {activeView === 'diff' && diffResult && (
          <DiffView
            fileName={currentFileName}
            diffResult={diffResult}
            onApply={() => handleApplyChanges()}
            onReject={() => {
              reset();
              setActiveView('input');
            }}
            onEdit={() => setActiveView('edit')}
            isApplying={isApplying}
          />
        )}

        {activeView === 'edit' && diffResult && (
          <EditView
            initialText={diffResult.replacement}
            onSaveAndApply={(edited) => handleApplyChanges(edited)}
            onCancel={() => setActiveView('diff')}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={updateSettings}
            onValidateKey={validateKey}
            isValidating={isValidating}
            onBack={() => setActiveView('input')}
          />
        )}

        {/* Shortcuts Cheat Sheet Modal */}
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        {/* LaTeX Template Library Modal */}
        <TemplateLibraryModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          onInsertTemplate={handleInsertTemplate}
          defaultCategory={lastMeta?.docMode}
        />
      </Panel>
    </div>
  );
};
