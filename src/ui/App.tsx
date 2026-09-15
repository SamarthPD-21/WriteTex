import React, { useState, useEffect, useCallback } from 'react';
import { FloatingButton } from './components/FloatingButton';
import { Panel } from './components/Panel';
import { ChatInput } from './components/ChatInput';
import { StreamingView } from './components/StreamingView';
import { DiffView } from './components/DiffView';
import { EditView } from './components/EditView';
import { SettingsView } from './components/SettingsView';
import { Toast, ToastMessage, ToastAction } from './components/Toast';
import { useEditor } from './hooks/useEditor';
import { useSettings } from './hooks/useSettings';
import { useAI } from './hooks/useAI';
import { usePanelPosition } from './hooks/usePanelPosition';
import { applyFuzzyPatch } from '../diff/apply';

export type AppView = 'input' | 'streaming' | 'diff' | 'edit' | 'settings';

export const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<AppView>('input');
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const {
    isEditorReady,
    selectedText,
    currentFileName,
    selectionRange,
    currentLine,
    getFullContent,
    replaceSelection,
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
  } = useAI(settings);

  const { position, handleMouseDown } = usePanelPosition();

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

  // Auto-migrate away from deprecated models on load
  useEffect(() => {
    if (settings.model === 'gemini-2.5-pro') {
      updateSettings({ model: 'gemini-3.1-pro-preview' });
    }
  }, [settings.model, updateSettings]);

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

  // Handle in-page keyboard shortcuts: Ctrl+Shift+W to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        if (activeView === 'settings') {
          setActiveView('input');
        } else if (activeView === 'edit') {
          setActiveView('diff');
        } else {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeView]);

  // Sync AI state with active view & handle smart error recovery
  useEffect(() => {
    if (aiStatus === 'streaming') {
      setActiveView('streaming');
    } else if (aiStatus === 'done' && diffResult && diffResult.hasChanges) {
      setActiveView('diff');
    } else if (aiStatus === 'error') {
      if (aiError) {
        if (aiError.includes('gemini-2.5-pro') || aiError.includes('gemini-3.1-pro-preview')) {
          addToast('error', aiError, {
            label: 'Switch to Gemini 3.1 Pro Preview',
            onClick: () => {
              updateSettings({ provider: 'gemini', model: 'gemini-3.1-pro-preview' });
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

  const handleGenerate = async (prompt: string, presetKey?: string) => {
    setLastPrompt(prompt);
    const fullDoc = await getFullContent();

    generate(
      prompt,
      {
        selectedText: selectedText || undefined,
        currentFileContent: fullDoc || undefined,
        currentFileName,
        currentLineNumber: currentLine?.number,
        currentLineText: currentLine?.text,
      },
      presetKey
    );
  };

  /**
   * TRANSACTIONAL APPLICATION OF EDITS DIRECTLY INTO OVERLEAF
   */
  const handleApplyChanges = async (overrideReplacement?: string) => {
    const replacement = overrideReplacement || diffResult?.replacement;
    if (!replacement) return;

    setIsApplying(true);

    try {
      let applied = false;

      // Case 1: Active selection exists with coordinates
      if (selectionRange && !selectionRange.empty) {
        applied = await replaceRange(selectionRange.from, selectionRange.to, replacement);
      } else if (selectedText && selectedText.trim().length > 0) {
        // Case 2: Text selected
        applied = await replaceSelection(replacement);
      } else {
        // Case 3: Patch into full document via fuzzy match
        const fullDoc = await getFullContent();
        if (fullDoc) {
          const originalSnippet = diffResult?.original || currentLine?.text || '';
          const patchResult = applyFuzzyPatch(fullDoc, originalSnippet, replacement);

          if (patchResult.success) {
            applied = await replaceRange(0, fullDoc.length, patchResult.patchedText);
          }
        }
      }

      if (applied) {
        addToast('success', `✓ Applied changes to ${currentFileName}`);
        reset();
        setActiveView('input');

        if (settings.autoCollapseOnApply) {
          setIsOpen(false);
        }
      } else {
        addToast('error', 'Failed to apply changes directly to editor. Check console.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', `Error applying patch: ${msg}`);
    } finally {
      setIsApplying(false);
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
        onMouseDownHeader={handleMouseDown}
        isSettingsOpen={activeView === 'settings'}
        onToggleSettings={() => setActiveView(activeView === 'settings' ? 'input' : 'settings')}
        onMinimize={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
        isEditorConnected={isEditorReady}
      >
        <Toast toasts={toasts} onDismiss={dismissToast} />

        {activeView === 'input' && (
          <ChatInput
            selectedText={selectedText}
            currentFileName={currentFileName}
            settings={settings}
            onUpdateModel={(provider, model) => updateSettings({ provider, model })}
            onGenerate={handleGenerate}
            isGenerating={aiStatus === 'streaming'}
            onOpenSettings={() => setActiveView('settings')}
          />
        )}

        {activeView === 'streaming' && (
          <StreamingView
            currentFileName={currentFileName}
            userPrompt={lastPrompt}
            streamedText={streamedText}
            onStop={() => stop()}
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
      </Panel>
    </div>
  );
};
