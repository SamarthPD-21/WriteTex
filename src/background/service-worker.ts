import {
  RuntimeMessage,
  StreamEvent,
  GenerateRequest,
} from '../messaging/types';
import { getStoredSettings, saveStoredSettings, validateProviderKey } from './key-store';
import { routeAndStreamAI } from './ai-router';
import { cleanModelOutput } from '../prompts/builder';
import { analyzeGitHubProfile } from '../integrations/github/client';
import { FinishReason } from './providers/types';
import { isOverleafProjectUrl } from '../shared/overleaf-url';

console.log('[WriteTex] Service Worker initialized');

// Active streams map for cancellation
const activeGenerations = new Map<string, { abortController: AbortController }>();

function safePostMessage(port: chrome.runtime.Port, event: StreamEvent) {
  try {
    port.postMessage(event);
  } catch {
    // Port disconnected or closed by client
  }
}

// 1. Long-lived ports for real-time token streaming
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'WRITETEX_STREAM') return;

  const abortController = new AbortController();

  port.onMessage.addListener(async (msg: { type: string; request?: GenerateRequest; requestId?: string }) => {
    if (msg.type === 'START_GENERATE' && msg.request) {
      const { requestId } = msg.request;
      activeGenerations.set(requestId, { abortController });

      let accumulated = '';
      let finishReason: FinishReason = 'unknown';

      try {
        const stream = routeAndStreamAI(msg.request, abortController.signal);

        for await (const part of stream) {
          if (abortController.signal.aborted) break;
          if (part.type === 'finish') {
            finishReason = part.reason;
            continue;
          }
          accumulated += part.text;
          safePostMessage(port, { type: 'chunk', text: part.text });
        }

        if (!abortController.signal.aborted) {
          // Clean model fences for replacement text
          const cleaned = cleanModelOutput(accumulated);
          safePostMessage(port, { type: 'done', fullText: cleaned, finishReason });
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        safePostMessage(port, { type: 'error', error: errMsg });
      } finally {
        activeGenerations.delete(requestId);
      }
    } else if (msg.type === 'CANCEL' && msg.requestId) {
      const active = activeGenerations.get(msg.requestId);
      if (active) {
        active.abortController.abort();
        activeGenerations.delete(msg.requestId);
      }
    }
  });

  port.onDisconnect.addListener(() => {
    abortController.abort();
  });
});

// 2. Request/Response messages for Settings & Key validation
chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === 'WRITETEX_GET_SETTINGS') {
    getStoredSettings()
      .then((settings) => sendResponse({ success: true, settings }))
      .catch(() => sendResponse({ success: false }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'WRITETEX_SAVE_SETTINGS') {
    saveStoredSettings(message.payload)
      .then((settings) => sendResponse({ success: true, settings }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  if (message.type === 'WRITETEX_VALIDATE_KEY') {
    validateProviderKey(message.payload.provider, message.payload.apiKey)
      .then((valid) => sendResponse({ success: true, valid }))
      .catch(() => sendResponse({ success: false, valid: false }));
    return true;
  }

  if (message.type === 'WRITETEX_ANALYZE_GITHUB') {
    analyzeGitHubProfile(message.payload.url, message.payload.targetRole, message.payload.targetJobDescription)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  return false;
});

// 3. Only Overleaf project editors: toggle there, never anywhere else
async function togglePanelOnTab(tab?: chrome.tabs.Tab) {
  // tab.url is only visible for sites WriteTex has host access to (Overleaf), so any
  // other page arrives here without a URL and is ignored
  if (!tab?.id || !isOverleafProjectUrl(tab.url)) return;
  const tabId = tab.id;

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'WRITETEX_TOGGLE_PANEL' });
  } catch {
    // The tab was open before WriteTex was installed or reloaded: inject both scripts, then toggle
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['bridge.js'], world: 'MAIN' });
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: 'WRITETEX_TOGGLE_PANEL' }).catch(() => {});
      }, 150);
    } catch {
      // Tab closed or navigated away meanwhile
    }
  }
}

// 4. Keyboard shortcut and toolbar button
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-writetex') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await togglePanelOnTab(tab);
  }
});

chrome.action.onClicked.addListener((tab) => {
  togglePanelOnTab(tab);
});

// 5. The toolbar button is greyed out on every tab except Overleaf project pages.
// Without the "tabs" permission a tab's URL is only visible for Overleaf (our host
// permission), so every other tab reads as "not a project" and is disabled.
async function syncActionForTab(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (isOverleafProjectUrl(tab.url)) await chrome.action.enable(tabId);
    else await chrome.action.disable(tabId);
  } catch {
    // Tab closed meanwhile
  }
}

async function syncAllTabs() {
  // Per-tab state is what matters; clear any global disable left by older versions
  await chrome.action.enable();
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter((t) => t.id !== undefined).map((t) => syncActionForTab(t.id!)));
}

chrome.tabs.onCreated.addListener((tab) => tab.id !== undefined && syncActionForTab(tab.id));
chrome.tabs.onUpdated.addListener((tabId) => syncActionForTab(tabId));
chrome.runtime.onInstalled.addListener(() => {
  syncAllTabs().catch(() => {});
});
syncAllTabs().catch(() => {});
