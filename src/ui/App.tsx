import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { FloatingButton } from './components/FloatingButton';
import { Panel } from './components/Panel';
import { ChatInput, GenerateExtras } from './components/ChatInput';
import { StreamingView } from './components/StreamingView';
import { DiffView } from './components/DiffView';
import { EditView } from './components/EditView';
import { AnswerView } from './components/AnswerView';
import { SettingsView } from './components/SettingsView';
import { Toast, ToastMessage, ToastAction } from './components/Toast';
import { ShortcutsModal } from './components/ShortcutsModal';
import { TemplateLibraryModal } from './components/TemplateLibraryModal';
import { useEditor } from './hooks/useEditor';
import { useSettings } from './hooks/useSettings';
import { useAI } from './hooks/useAI';
import { useWorkspace, HistoryItem, EMPTY_WORKSPACE } from './hooks/useWorkspace';
import { usePanelLayout } from './hooks/usePanelLayout';
import { EditPlan, createPlan, invertPlan, planEdit, rebasePlan, structuralWarnings } from '../diff/edit-plan';
import { autoRepairLatexDocument } from '../latex/auto-repair';
import { unicodeMappingPatch } from '../analysis/ats-score';
import { isExtensionContextValid } from '../messaging/runtime';
import { AVAILABLE_MODELS } from '../messaging/types';

export type AppView = 'input' | 'streaming' | 'review' | 'edit' | 'answer' | 'settings';

const MAX_UNDO = 15;
const DOC_REFRESH_DEBOUNCE_MS = 600;

export const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AppView>('input');
  const [draft, setDraft] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isContextInvalidated, setIsContextInvalidated] = useState(!isExtensionContextValid());
  const [fullDoc, setFullDoc] = useState('');
  const [undoStack, setUndoStack] = useState<EditPlan[]>([]);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const editor = useEditor();
  const { settings, updateSettings, validateKey, isValidating } = useSettings();
  const ai = useAI(settings);
  const { workspace, update: updateWorkspace, addHistory } = useWorkspace(editor.projectId);
  const layout = usePanelLayout();

  const { result } = ai;
  const hasSelection = Boolean(editor.selectionRange && !editor.selectionRange.empty);

  const addToast = useCallback((type: ToastMessage['type'], text: string, action?: ToastAction) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev.slice(-1), { id, type, text, action }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), action ? 7000 : 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Keep a copy of the document for keyword analysis; refreshed lazily while open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      editor.getFullContent().then((content) => content !== null && setFullDoc(content));
    }, DOC_REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isOpen, editor.docLength, editor.currentFileName, editor.getFullContent]);

  // Pick resume vs. cover letter from the file name until the user chooses
  useEffect(() => {
    if (workspace.docModeLocked) return;
    const lower = editor.currentFileName.toLowerCase();
    // Cover letter wins for names like "resume_cover_letter.tex"
    const detected =
      lower.includes('cover') || lower.includes('letter')
        ? 'cover_letter'
        : lower.includes('resume') || lower.includes('cv')
        ? 'resume'
        : null;
    if (detected && detected !== workspace.docMode) updateWorkspace({ docMode: detected });
  }, [editor.currentFileName, workspace.docModeLocked, workspace.docMode, updateWorkspace]);

  // Toolbar button / keyboard command from the service worker
  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg?.type === 'WRITETEX_TOGGLE_PANEL') setIsOpen((prev) => !prev);
    };
    try {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    } catch {
      return undefined;
    }
  }, []);

  // React to generation results
  const recordedResultId = useRef<string | null>(null);
  useEffect(() => {
    if (ai.status === 'done' && result) {
      if (recordedResultId.current !== result.id && result.source === 'model') {
        recordedResultId.current = result.id;
        addHistory({
          prompt: result.prompt,
          output: result.output,
          kind: result.kind,
          docMode: workspace.docMode,
          fileName: editor.currentFileName,
        });
      }
      setView((current) => (current === 'edit' ? current : result.kind === 'answer' ? 'answer' : 'review'));
    } else if (ai.status === 'error' && ai.error) {
      const err = ai.error;
      if (/Extension (updated|context invalidated)/.test(err)) {
        setIsContextInvalidated(true);
      } else if (/api key/i.test(err)) {
        addToast('error', err, { label: 'Open settings', onClick: () => setView('settings') });
      } else if (/not found|no longer available/i.test(err) && settings.provider === 'gemini') {
        addToast('error', err, {
          label: 'Use Gemini 2.0 Flash',
          onClick: () => updateSettings({ provider: 'gemini', model: 'gemini-2.0-flash' }),
        });
      } else {
        addToast('error', err);
      }
      setView('input');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.status, result, ai.error]);

  const handleStop = useCallback(() => {
    ai.stop();
    setView('input');
  }, [ai]);

  const discardResult = useCallback(() => {
    ai.reset();
    setView('input');
  }, [ai]);

  const handleGenerate = async (prompt: string, presetKey?: string, extras?: GenerateExtras) => {
    const doc = (await editor.getFullContent()) ?? '';
    setFullDoc(doc);
    const sel = editor.selectionRange && !editor.selectionRange.empty ? editor.selectionRange : null;

    ai.generate(
      prompt,
      {
        selectedText: sel?.text,
        currentFileContent: doc || undefined,
        currentFileName: editor.currentFileName,
        currentLineNumber: editor.currentLine?.number,
        currentLineText: editor.currentLine?.text,
        docMode: workspace.docMode,
        targetCompany: workspace.targetCompany.trim() || undefined,
        targetRole: workspace.targetRole.trim() || undefined,
        jobDescription: workspace.jobDescription.trim() || undefined,
        githubAnalysis: workspace.githubAnalysis || undefined,
        attachedFiles: workspace.attachedFiles.length > 0 ? workspace.attachedFiles : undefined,
        overleafErrors: extras?.overleafErrors,
        hasNoPdf: extras?.hasNoPdf,
      },
      presetKey,
      {
        fileName: editor.currentFileName,
        selection: sel ? { from: sel.from, to: sel.to, text: sel.text } : null,
        approximateIndex: editor.currentLine?.from,
      }
    );
    setView('streaming');
  };

  /** Plans existing LaTeX against the live document and opens the review screen. */
  const reviewOutput = async (label: string, latex: string, makePlan?: (doc: string) => EditPlan | null) => {
    const doc = (await editor.getFullContent()) ?? '';
    setFullDoc(doc);
    const plan = makePlan
      ? makePlan(doc)
      : planEdit(doc, latex, { fileName: editor.currentFileName, approximateIndex: editor.currentLine?.from });
    ai.preview(label, latex, plan);
    setView('review');
  };

  /**
   * Writes a plan into Overleaf. The target is re-found in the live document and
   * written with compare-and-swap, so concurrent typing is never overwritten.
   */
  const applyPlan = async (plan: EditPlan): Promise<{ from: number } | null> => {
    if (plan.fileName !== editor.currentFileName) {
      addToast('warning', `This edit is for ${plan.fileName}. Open that file in Overleaf first.`);
      return null;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const doc = await editor.getFullContent();
      if (doc === null) {
        addToast('error', 'Could not read the document from Overleaf.');
        return null;
      }
      const target = rebasePlan(doc, plan);
      if (!target) {
        addToast(
          'warning',
          'The text this edit targets has changed since it was generated. Select the text to replace and use “Use selection”, or regenerate.'
        );
        return null;
      }
      const outcome = await editor.applyEdit(target.from, target.to, plan.newText, doc.slice(target.from, target.to));
      if (outcome === 'applied') return { from: target.from };
      if (outcome === 'failed') {
        addToast('error', 'Overleaf rejected the edit. Try again, or copy the LaTeX manually.');
        return null;
      }
      // 'stale': the document changed between read and write — re-read and retry
    }
    addToast('warning', 'The document kept changing while applying. Pause typing and try again.');
    return null;
  };

  const handleUndo = async () => {
    const [latest, ...rest] = undoStack;
    if (!latest) return;
    setIsApplying(true);
    try {
      if (await applyPlan(latest)) {
        setUndoStack(rest);
        // Older "Undo" buttons would now revert a different edit
        setToasts((prev) => prev.filter((t) => t.action?.label !== 'Undo'));
        addToast('info', `Reverted: ${latest.description.replace(/^Undo: /, '')}`);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleApply = async () => {
    const plan = result?.plan;
    if (!plan) return;
    setIsApplying(true);
    try {
      const applied = await applyPlan(plan);
      if (!applied) return;
      setUndoStack((prev) => [invertPlan(plan, applied.from), ...prev].slice(0, MAX_UNDO));
      addToast('success', `${plan.description} · ${plan.fileName}`, { label: 'Undo', onClick: () => handleUndoRef.current() });
      ai.reset();
      setView('input');
      if (settings.autoCollapseOnApply) setIsOpen(false);
    } catch (err: unknown) {
      addToast('error', `Could not apply: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Toast actions outlive renders; always call the latest undo
  const handleUndoRef = useRef(handleUndo);
  handleUndoRef.current = handleUndo;

  const handleRelocate = async () => {
    if (!result || !editor.selectionRange || editor.selectionRange.empty) return;
    const doc = (await editor.getFullContent()) ?? '';
    const sel = editor.selectionRange;
    ai.updatePlan(
      planEdit(doc, result.output, {
        fileName: editor.currentFileName,
        selection: { from: sel.from, to: sel.to, text: sel.text },
      })
    );
  };

  const handleEditSave = async (text: string) => {
    const plan = result?.plan;
    const doc = (await editor.getFullContent()) ?? '';
    if (plan) {
      const warnings = structuralWarnings(doc, doc.slice(0, plan.from) + text + doc.slice(plan.to));
      ai.updatePlan({ ...plan, newText: text, warnings });
    } else {
      ai.updatePlan(planEdit(doc, text, { fileName: editor.currentFileName, approximateIndex: editor.currentLine?.from }));
    }
    setView('review');
  };

  const handleAutoRepair = async () => {
    const doc = (await editor.getFullContent()) ?? '';
    setFullDoc(doc);
    const repair = autoRepairLatexDocument(doc);
    if (!repair.wasRepaired) {
      addToast('info', 'No broken macros or missing preamble found in this file.');
      return;
    }
    const plan = createPlan(doc, 0, doc.length, repair.repairedDoc, 'full_document', 1, editor.currentFileName);
    const fixes = repair.repairsMade.slice(0, 2).join('; ') + (repair.repairsMade.length > 2 ? '…' : '');
    ai.preview('Quick repair', repair.repairedDoc, { ...plan, description: `Repairs: ${fixes}` });
    setView('review');
  };

  const handleAtsPatch = (patch: 'unicode-mapping') => {
    if (patch !== 'unicode-mapping') return;
    reviewOutput('ATS: unicode mapping', '', (doc) => {
      const fix = unicodeMappingPatch(doc);
      if (!fix) return null;
      const plan = createPlan(doc, fix.at, fix.at, fix.insert, 'preamble', 1, editor.currentFileName);
      return { ...plan, description: 'Adds unicode mapping so ATS can read the PDF text' };
    });
  };

  const handleInsertTemplate = (latex: string) => {
    setIsTemplatesOpen(false);
    reviewOutput('Template', latex, (doc) => {
      const sel = editor.selectionRange && !editor.selectionRange.empty ? editor.selectionRange : null;
      if (sel) return createPlan(doc, sel.from, sel.to, latex, 'selection', 1, editor.currentFileName);
      const plan = createPlan(doc, 0, doc.length, latex, 'full_document', 1, editor.currentFileName);
      return doc.trim() ? { ...plan, description: 'Replaces the whole file with the template' } : { ...plan, description: 'Inserts the template' };
    });
  };

  const handleReviewHistory = (item: HistoryItem) => reviewOutput(item.prompt, item.output);

  // Global keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }
      if (!isOpen) return;
      // Escape and "?" belong to the Overleaf editor unless focus is inside the panel
      const path = e.composedPath();
      const inPanel = path.some((node) => (node as Element).id === 'writetex-extension-root');
      if (!inPanel) return;
      if (e.key === 'Escape') {
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        else if (isTemplatesOpen) setIsTemplatesOpen(false);
        else if (view === 'settings') setView('input');
        else if (view === 'edit') setView('review');
        else if (view === 'streaming') handleStop();
        else if (view === 'review' || view === 'answer') discardResult();
        else setIsOpen(false);
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.composedPath()[0] as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, view, isShortcutsOpen, isTemplatesOpen, handleStop, discardResult]);

  return (
    <div className="writetex-root-container">
      <FloatingButton isOpen={isOpen} hasSelection={hasSelection} onClick={() => setIsOpen(true)} />

      <Panel
        isOpen={isOpen}
        rect={layout.rect}
        dragMode={layout.dragMode}
        beginDrag={layout.beginDrag}
        onResetLayout={layout.reset}
        isSettingsOpen={view === 'settings'}
        onToggleSettings={() => setView(view === 'settings' ? 'input' : 'settings')}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        undoCount={undoStack.length}
        onUndo={isApplying ? undefined : handleUndo}
        onClose={() => setIsOpen(false)}
        isEditorConnected={editor.isEditorReady}
      >
        <Toast toasts={toasts} onDismiss={dismissToast} />

        {isContextInvalidated && (
          <div className="flex items-center gap-2 p-2.5 mx-3 mt-2 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-100 text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="flex-1">WriteTex was updated. Refresh this tab to reconnect.</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-semibold"
            >
              Refresh
            </button>
          </div>
        )}

        {view === 'input' && (
          <ChatInput
            workspace={workspace}
            onUpdateWorkspace={updateWorkspace}
            prompt={draft}
            onPromptChange={setDraft}
            selectedText={editor.selectedText}
            currentFileName={editor.currentFileName}
            currentFileContent={fullDoc}
            settings={settings}
            onUpdateModel={(provider, model) => {
              updateSettings({ provider, model });
              const info = AVAILABLE_MODELS[provider]?.find((m) => m.id === model);
              addToast('info', `Using ${info?.name || model}`);
            }}
            onGenerate={handleGenerate}
            isGenerating={ai.status === 'streaming'}
            onStop={handleStop}
            onOpenSettings={() => setView('settings')}
            onReviewHistory={handleReviewHistory}
            onPreview={(label, latex) => reviewOutput(label, latex)}
            onAutoRepair={handleAutoRepair}
            onAtsPatch={handleAtsPatch}
            onRefreshDocument={async () => {
              const content = await editor.getFullContent();
              if (content !== null) setFullDoc(content);
            }}
          />
        )}

        {view === 'streaming' && (
          <StreamingView
            currentFileName={editor.currentFileName}
            userPrompt={ai.lastPrompt}
            streamedText={ai.streamedText}
            onStop={handleStop}
          />
        )}

        {view === 'review' && result && (
          <DiffView
            fileName={result.plan?.fileName || editor.currentFileName}
            output={result.output}
            plan={result.plan}
            finishReason={result.finishReason}
            onApply={handleApply}
            onReject={discardResult}
            onEdit={() => setView('edit')}
            onRelocate={handleRelocate}
            hasSelection={hasSelection}
            isApplying={isApplying}
          />
        )}

        {view === 'edit' && result && (
          <EditView
            initialText={result.plan?.newText ?? result.output}
            onSaveAndApply={handleEditSave}
            onCancel={() => setView('review')}
          />
        )}

        {view === 'answer' && result && (
          <AnswerView
            prompt={result.prompt}
            answer={result.output}
            onBack={discardResult}
            onFollowUp={() => {
              ai.reset();
              setView('input');
            }}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={updateSettings}
            onValidateKey={validateKey}
            isValidating={isValidating}
            onBack={() => setView('input')}
            onClearWorkspace={() => {
              updateWorkspace({ ...EMPTY_WORKSPACE });
              addToast('info', 'Cleared saved data for this project.');
            }}
          />
        )}

        <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        <TemplateLibraryModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          onInsertTemplate={handleInsertTemplate}
          defaultCategory={workspace.docMode}
        />
      </Panel>
    </div>
  );
};
