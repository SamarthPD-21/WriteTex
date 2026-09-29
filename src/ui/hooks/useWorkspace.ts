import { useCallback, useEffect, useRef, useState } from 'react';
import { DocumentMode } from '../../messaging/types';
import { GitHubAnalysisResult } from '../../integrations/github/types';
import { FileAttachment } from '../../integrations/files/types';

export interface HistoryItem {
  id: string;
  prompt: string;
  output: string;
  kind: 'edit' | 'answer';
  docMode: DocumentMode;
  fileName: string;
  timestamp: number;
}

/**
 * Everything the user sets up for a tailoring session. Persisted per Overleaf
 * project so it survives view switches, panel close, and page reloads.
 */
export interface Workspace {
  docMode: DocumentMode;
  /** True once the user picked a mode by hand; stops filename auto-detection. */
  docModeLocked: boolean;
  targetCompany: string;
  targetRole: string;
  jobDescription: string;
  githubUrl: string;
  githubAnalysis: GitHubAnalysisResult | null;
  attachedFiles: FileAttachment[];
  history: HistoryItem[];
}

export const EMPTY_WORKSPACE: Workspace = {
  docMode: 'resume',
  docModeLocked: false,
  targetCompany: '',
  targetRole: '',
  jobDescription: '',
  githubUrl: '',
  githubAnalysis: null,
  attachedFiles: [],
  history: [],
};

const MAX_HISTORY = 25;
const MAX_HISTORY_OUTPUT_CHARS = 20000;
const SAVE_DEBOUNCE_MS = 400;

const storageKey = (projectId: string) => `writetex_workspace_${projectId}`;

function hasChromeStorage(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local) && Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function useWorkspace(projectId: string) {
  const [workspace, setWorkspace] = useState<Workspace>(EMPTY_WORKSPACE);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(workspace);
  latest.current = workspace;

  useEffect(() => {
    let mounted = true;
    setIsLoaded(false);
    if (!hasChromeStorage()) {
      setIsLoaded(true);
      return;
    }
    chrome.storage.local
      .get(storageKey(projectId))
      .then((data) => {
        if (!mounted) return;
        const stored = data?.[storageKey(projectId)];
        if (stored) setWorkspace({ ...EMPTY_WORKSPACE, ...stored });
      })
      .catch(() => {})
      .finally(() => mounted && setIsLoaded(true));
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const persist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      if (!hasChromeStorage()) return;
      chrome.storage.local.set({ [storageKey(projectId)]: latest.current }).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, [projectId]);

  // Flush a pending save when the tab closes
  useEffect(() => {
    const flush = () => {
      if (!saveTimer.current || !hasChromeStorage()) return;
      clearTimeout(saveTimer.current);
      chrome.storage.local.set({ [storageKey(projectId)]: latest.current }).catch(() => {});
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [projectId]);

  const update = useCallback(
    (patch: Partial<Workspace> | ((prev: Workspace) => Partial<Workspace>)) => {
      setWorkspace((prev) => {
        const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
        latest.current = next;
        return next;
      });
      if (isLoaded) persist();
    },
    [isLoaded, persist]
  );

  const addHistory = useCallback(
    (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
      update((prev) => ({
        history: [
          {
            ...item,
            output: item.output.slice(0, MAX_HISTORY_OUTPUT_CHARS),
            id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
          },
          ...prev.history,
        ].slice(0, MAX_HISTORY),
      }));
    },
    [update]
  );

  return { workspace, isLoaded, update, addHistory };
}
