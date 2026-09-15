import {
  BRIDGE_MSG_SOURCE_CONTENT,
  BRIDGE_MSG_SOURCE_PAGE,
} from '../../messaging/types';

/**
 * WriteTex CodeMirror 6 MAIN World Bridge.
 * Executes directly within Overleaf's JavaScript context to interact
 * transactionally with the CodeMirror 6 EditorView.
 */
(() => {
  console.log('[WriteTex CM6 Bridge] Injected into page context');

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
          const { from, to, replacement } = command.payload;

          view.dispatch({
            changes: { from, to, insert: replacement },
            selection: { anchor: from + replacement.length },
            scrollIntoView: true,
          });
          view.focus();

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

  const observer = new MutationObserver(() => {
    checkAndAnnounce();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  checkAndAnnounce();
})();
