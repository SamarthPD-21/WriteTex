import {
  RuntimeMessage,
  StreamEvent,
  GenerateRequest,
} from '../messaging/types';
import { getStoredSettings, saveStoredSettings, validateProviderKey } from './key-store';
import { routeAndStreamAI } from './ai-router';
import { cleanModelOutput } from '../prompts/builder';
import { analyzeGitHubProfile } from '../integrations/github/client';

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

      try {
        const stream = routeAndStreamAI(msg.request, abortController.signal);

        for await (const chunk of stream) {
          if (abortController.signal.aborted) {
            break;
          }
          accumulated += chunk;
          safePostMessage(port, { type: 'chunk', text: chunk });
        }

        if (!abortController.signal.aborted) {
          // Clean model fences for replacement text
          const cleaned = cleanModelOutput(accumulated);
          safePostMessage(port, { type: 'done', fullText: cleaned });
        }
      } catch (err: unknown) {
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

// 3. Helper to safely toggle WriteTex on active tab
async function togglePanelOnTab(tabId?: number) {
  if (!tabId) return;

  try {
    // Attempt sending toggle message
    await chrome.tabs.sendMessage(tabId, { type: 'WRITETEX_TOGGLE_PANEL' });
  } catch {
    // "Could not establish connection. Receiving end does not exist" happens when:
    // 1) The active tab is not an Overleaf tab, or
    // 2) The Overleaf tab was open before the extension was installed/reloaded.
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url?.includes('overleaf.com')) {
        // Dynamically inject content script into this tab
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        });

        // Give it 150ms to mount, then send toggle
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { type: 'WRITETEX_TOGGLE_PANEL' }).catch(() => {});
        }, 150);
      }
    } catch {
      // Ignored for non-injectable tabs (chrome://, new tab, etc.)
    }
  }
}

// 4. Handle Keyboard shortcuts and Extension Action clicks
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-writetex') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await togglePanelOnTab(tab.id);
    }
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    await togglePanelOnTab(tab.id);
  }
});
