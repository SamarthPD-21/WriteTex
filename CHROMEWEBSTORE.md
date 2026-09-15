# Chrome Web Store Listing & Permissions Justification

## Overview
- **Extension Name:** WriteTex — AI Copilot for LaTeX
- **Short Name:** WriteTex
- **Version:** 0.1.0
- **Primary Category:** Productivity / Developer Tools
- **Pricing:** Free (Bring Your Own Key)

## Short Description (max 132 chars)
AI copilot for LaTeX and academic writing. Understands, edits, and improves research papers directly inside Overleaf.

## Detailed Description
WriteTex is an AI-native workspace and Chrome extension for LaTeX and academic writing that understands, edits, and debugs LaTeX documents directly inside Overleaf.

Eliminate the tedious loop of copying LaTeX code back and forth between Overleaf and generic chatbots. WriteTex seamlessly interfaces with Overleaf's CodeMirror 6 editor engine to propose safe, structured changes that you review before applying.

✦ AUTOMATIC IN-EDITOR EDITS
- Never copy-paste LaTeX back and forth again.
- WriteTex transactionally updates the live CodeMirror 6 editor buffer, automatically triggering Overleaf's ShareJS/OT real-time synchronization with co-authors and registering in your standard undo/redo history (Ctrl+Z).

✦ GIT-STYLE DIFF REVIEWS
- Never surprise the user: every modification is presented as a color-coded unified diff.
- View additions in green and deletions in red with word-level changes highlighted.
- Inspect the diff, manually adjust if desired, and apply with a single click or keyboard shortcut.

✦ BRING YOUR OWN KEY (BYOK) PRIVACY
- Protect unpublished research: your documents never touch a third-party intermediary proxy.
- Connect your own API key directly to Google Gemini, OpenAI, or Anthropic Claude.
- All keys are stored encrypted and locally on your device in browser storage.

✦ LATEX SEMANTIC ENGINE
- Powered by LaTeX Abstract Syntax Tree (AST) parsing.
- Enriched context awareness: detects active document classes, enclosing sections, surrounding math environments (equation, align), loaded packages, and defined citation keys.
- Automatic syntax validation ensures balanced braces, matched environments, and valid math mode delimiters.

✦ ACADEMIC PRESETS & SHORTCUTS
- One-click presets: Rewrite, Academic Tone, Fix Grammar, Shorten (fit page constraints), Expand, Fix LaTeX, and Fix Equation.
- Keyboard-first workflow: Ctrl+Shift+W to toggle panel, Ctrl+Enter to generate, Ctrl+Shift+Enter to apply.

---

## Permissions Justification (For Chrome Review Team)

### `storage`
Used to persist user preferences (selected AI provider, model choice, temperature) and user-provided API keys locally on the client machine via `chrome.storage.local`. No data is synced to external servers.

### `activeTab` & `tabs`
Required to detect active Overleaf project URLs (`https://www.overleaf.com/project/*`), identify the current tab, and toggle the WriteTex assistant panel when the extension action icon or keyboard shortcut (`Ctrl+Shift+W`) is triggered.

### `scripting`
Used to inject the CodeMirror 6 bridge and UI mount scripts into Overleaf project documents.

### Host Permissions

#### `*://*.overleaf.com/*`
Required to detect and interact with Overleaf LaTeX project editors, extract highlighted snippets, read document context, and dispatch edits directly into the CodeMirror 6 document buffer.

#### `https://generativelanguage.googleapis.com/*`
Required to make direct, client-side API calls to the user's Google Gemini API (BYOK) for streaming token generation without an intermediate backend server.

#### `https://api.openai.com/*`
Required to make direct, client-side API calls to the user's OpenAI API (BYOK) for streaming token generation.

#### `https://api.anthropic.com/*`
Required to make direct, client-side API calls to the user's Anthropic Claude API (BYOK) for streaming token generation.

---

## Privacy Policy & Data Use Disclosure
- **Does WriteTex collect personal data?** No. WriteTex does not collect, track, or sell user personal information, browsing history, or analytics.
- **Where are API keys stored?** In the user's local browser storage (`chrome.storage.local`).
- **Where is document content transmitted?** Only directly from the user's browser to the AI provider explicitly configured by the user (Google, OpenAI, or Anthropic).
