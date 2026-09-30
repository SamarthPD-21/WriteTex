import {
  BRIDGE_MSG_SOURCE_CONTENT,
  BRIDGE_MSG_SOURCE_PAGE,
} from '../../messaging/types';
import { isOverleafProjectUrl } from '../../shared/overleaf-url';

/**
 * WriteTex CodeMirror 6 MAIN World Bridge.
 * Executes directly within Overleaf's JavaScript context to interact
 * transactionally with the CodeMirror 6 EditorView.
 */
(() => {
  // Only Overleaf project editors expose a document to WriteTex
  if (!isOverleafProjectUrl(window.location.href)) return;

  function getEditorView(): any {
    // 1. Try .cm-content.cmView.view (primary CM6 DOM attachment)
    const contentEl = document.querySelector('.cm-content') as any;
    if (contentEl?.cmView?.view) {
      return contentEl.cmView.view;
    }

    // 2. Try .cm-editor.cmView.view
    const editorEl = document.querySelector('.cm-editor') as any;
    if (editorEl?.cmView?.view) {
      return editorEl.cmView.view;
    }

    // 3. Fallback: Traverse child elements
    const allCm = document.querySelectorAll('.cm-content, .cm-editor');
    for (const el of Array.from(allCm) as any[]) {
      if (el.cmView?.view) {
        return el.cmView.view;
      }
    }

    return null;
  }

  function handleCommand(command: any, id: string) {
    const view = getEditorView();

    switch (command.type) {
      case 'PING': {
        sendResponse(id, { type: 'PONG', ready: Boolean(view) });
        break;
      }

      case 'GET_SELECTION': {
        if (!view) {
          sendResponse(id, { type: 'SELECTION_RESULT', payload: null });
          return;
        }
        const { from, to, empty } = view.state.selection.main;
        const text = view.state.sliceDoc(from, to);
        const cursor = view.state.selection.main.head;
        sendResponse(id, {
          type: 'SELECTION_RESULT',
          payload: { from, to, text, empty, cursor },
        });
        break;
      }

      case 'GET_SNAPSHOT': {
        if (!view) {
          sendResponse(id, { type: 'SNAPSHOT_RESULT', payload: null });
          return;
        }
        const main = view.state.selection.main;
        const line = view.state.doc.lineAt(main.head);
        sendResponse(id, {
          type: 'SNAPSHOT_RESULT',
          payload: {
            selection: {
              from: main.from,
              to: main.to,
              text: view.state.sliceDoc(main.from, main.to),
              empty: main.empty,
              cursor: main.head,
            },
            line: { number: line.number, text: line.text, from: line.from, to: line.to },
            docLength: view.state.doc.length,
          },
        });
        break;
      }

      case 'GET_CONTENT': {
        if (!view) {
          sendResponse(id, { type: 'CONTENT_RESULT', payload: null });
          return;
        }
        const docText = view.state.doc.toString();
        sendResponse(id, { type: 'CONTENT_RESULT', payload: docText });
        break;
      }

      case 'GET_CURRENT_LINE': {
        if (!view) {
          sendResponse(id, { type: 'CURRENT_LINE_RESULT', payload: null });
          return;
        }
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        sendResponse(id, {
          type: 'CURRENT_LINE_RESULT',
          payload: {
            number: line.number,
            text: line.text,
            from: line.from,
            to: line.to,
          },
        });
        break;
      }

      case 'REPLACE_SELECTION': {
        if (!view) {
          sendResponse(id, {
            type: 'MUTATION_RESULT',
            success: false,
            error: 'EditorView not found',
          });
          return;
        }
        try {
          const { from, to } = view.state.selection.main;
          const { replacement } = command.payload;

          view.dispatch({
            changes: { from, to, insert: replacement },
            selection: { anchor: from + replacement.length },
            scrollIntoView: true,
          });
          view.focus();

          // Verification Read-Back
          const check = view.state.sliceDoc(from, from + replacement.length);
          const success = check === replacement;

          sendResponse(id, { type: 'MUTATION_RESULT', success });
        } catch (err: unknown) {
          sendResponse(id, {
            type: 'MUTATION_RESULT',
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }

      case 'REPLACE_RANGE': {
        if (!view) {
          sendResponse(id, {
            type: 'MUTATION_RESULT',
            success: false,
            error: 'EditorView not found',
          });
          return;
        }
        try {
          const { from, to, replacement, expected } = command.payload;
          const docLength = view.state.doc.length;
          if (from < 0 || to > docLength || from > to) {
            sendResponse(id, { type: 'MUTATION_RESULT', success: false, error: 'STALE' });
            return;
          }

          // Compare-and-swap: refuse to write if the target text moved or changed
          const current = view.state.sliceDoc(from, to);
          if (typeof expected === 'string' && current !== expected) {
            sendResponse(id, { type: 'MUTATION_RESULT', success: false, error: 'STALE' });
            return;
          }

          // Dispatch only the span that actually differs, so collaborators' edits,
          // the cursor, and Overleaf history are disturbed as little as possible
          let prefix = 0;
          const maxPrefix = Math.min(current.length, replacement.length);
          while (prefix < maxPrefix && current[prefix] === replacement[prefix]) prefix++;
          let suffix = 0;
          const maxSuffix = maxPrefix - prefix;
          while (
            suffix < maxSuffix &&
            current[current.length - 1 - suffix] === replacement[replacement.length - 1 - suffix]
          ) {
            suffix++;
          }

          const changeFrom = from + prefix;
          const changeTo = to - suffix;
          const insert = replacement.slice(prefix, replacement.length - suffix);
          if (changeFrom !== changeTo || insert.length > 0) {
            view.dispatch({
              changes: { from: changeFrom, to: changeTo, insert },
              selection: { anchor: changeFrom + insert.length },
              scrollIntoView: true,
              userEvent: 'input.writetex',
            });
          }
          view.focus();

          const check = view.state.sliceDoc(from, from + replacement.length);
          sendResponse(id, { type: 'MUTATION_RESULT', success: check === replacement });
        } catch (err: unknown) {
          sendResponse(id, {
            type: 'MUTATION_RESULT',
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }

      case 'INSERT_AT_CURSOR': {
        if (!view) {
          sendResponse(id, {
            type: 'MUTATION_RESULT',
            success: false,
            error: 'EditorView not found',
          });
          return;
        }
        try {
          const { text } = command.payload;
          const cursor = view.state.selection.main.head;

          view.dispatch({
            changes: { from: cursor, insert: text },
            selection: { anchor: cursor + text.length },
            scrollIntoView: true,
          });
          view.focus();

          sendResponse(id, { type: 'MUTATION_RESULT', success: true });
        } catch (err: unknown) {
          sendResponse(id, {
            type: 'MUTATION_RESULT',
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }

      default:
        console.warn('[WriteTex CM6 Bridge] Unknown command:', command);
    }
  }

  function sendResponse(id: string, response: any) {
    window.postMessage(
      {
        source: BRIDGE_MSG_SOURCE_PAGE,
        id,
        response,
      },
      '*'
    );
  }

  // Listen for requests from the Content Script
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== BRIDGE_MSG_SOURCE_CONTENT) {
      return;
    }
    const { id, command } = event.data;
    if (id && command) {
      handleCommand(command, id);
    }
  });

  // Watch for CM6 editor to mount dynamically if not already present
  let announced = false;
  function checkAndAnnounce() {
    if (getEditorView() && !announced) {
      announced = true;
      window.postMessage(
        {
          source: BRIDGE_MSG_SOURCE_PAGE,
          id: 'initial_ready',
          response: { type: 'PONG', ready: true },
        },
        '*'
      );
    }
  }

  // Overleaf's DOM mutates constantly; stop observing once the editor is found
  const observer = new MutationObserver(() => {
    checkAndAnnounce();
    if (announced) observer.disconnect();
  });

  checkAndAnnounce();
  if (!announced) observer.observe(document.body, { childList: true, subtree: true });
})();
