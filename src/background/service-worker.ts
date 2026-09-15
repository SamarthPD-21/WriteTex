import {
  RuntimeMessage,
  StreamEvent,
  GenerateRequest,
} from '../messaging/types';
import { getStoredSettings, saveStoredSettings, validateProviderKey } from './key-store';
import { routeAndStreamAI } from './ai-router';
import { cleanModelOutput } from '../prompts/builder';

console.log('[WriteTex] Service Worker initialized');

// Active streams map for cancellation
const activeGenerations = new Map<string, { abortController: AbortController }>();

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
        const stream = routeAndStreamAI(msg.request);

        for await (const chunk of stream) {
          if (abortController.signal.aborted) {
            break;
          }
          accumulated += chunk;
          port.postMessage({ type: 'chunk', text: chunk } as StreamEvent);
        }

        if (!abortController.signal.aborted) {
          // Clean model fences for replacement text
          const cleaned = cleanModelOutput(accumulated);
          port.postMessage({ type: 'done', fullText: cleaned } as StreamEvent);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        port.postMessage({ type: 'error', error: errMsg } as StreamEvent);
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
    getStoredSettings().then((settings) => sendResponse({ success: true, settings }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'WRITETEX_SAVE_SETTINGS') {
    saveStoredSettings(message.payload).then((settings) => sendResponse({ success: true, settings }));
    return true;
  }

  if (message.type === 'WRITETEX_VALIDATE_KEY') {
    validateProviderKey(message.payload.provider, message.payload.apiKey).then((valid) =>
      sendResponse({ success: true, valid })
    );
    return true;
  }

  return false;
});

// 3. Handle Keyboard shortcuts and Extension Action clicks
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-writetex') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'WRITETEX_TOGGLE_PANEL' });
    }
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'WRITETEX_TOGGLE_PANEL' });
  }
});
