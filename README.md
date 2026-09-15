# WriteTex — AI Copilot for LaTeX & Overleaf

> **WriteTex** is an AI-native workspace and Chrome extension for LaTeX and academic writing that understands, edits, and debugs LaTeX documents directly inside Overleaf.

---

## ✦ Features

### 1. Automatic In-Editor Edits (`view.dispatch`)
- Unlike standard chat assistants that force you to copy-paste code back and forth, WriteTex interacts directly with Overleaf's **CodeMirror 6 (CM6)** editor engine.
- When you click **Apply**, changes are dispatched natively through `view.dispatch({ changes })`:
  - Instantly updates the editor buffer.
  - Automatically triggers Overleaf's real-time ShareJS/OT collaborative synchronization.
  - Broadcasts changes to co-authors.
  - Seamlessly registers in `Ctrl+Z` undo/redo history.
  - Performs atomic read-back verification to guarantee concurrent edits never corrupt the document.

### 2. Git-Style Unified Diff Review
- **Never surprises the user:** AI proposes $\rightarrow$ User reviews $\rightarrow$ User approves $\rightarrow$ WriteTex applies.
- Clear color-coded diff view with line numbers:
  - Deletions in dark red with minus signs (`−`).
  - Additions in dark emerald green with plus signs (`+`).
  - Word-level highlighting within modified sentences.
  - Live additions/deletions stats counter (`+4 · -2`).
  - **[Apply]**, **[Reject]**, and **[Edit]** (allows manual adjustments before applying).

### 3. Bring-Your-Own-Key (BYOK) Multi-Provider AI
- Full privacy for unpublished research: your documents never pass through an intermediate SaaS backend.
- Supports 3 major AI providers with client-side streaming:
  - **Google Gemini**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 1.5 Pro
  - **OpenAI**: GPT-4o, GPT-4o mini, o3-mini
  - **Anthropic Claude**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku
- API keys are stored locally and encrypted in `chrome.storage.local`.
- Live API key validation with inline feedback.

### 4. LaTeX Semantic Intelligence
- Integrated with `@unified-latex` AST parser.
- Enriched prompt context automatically identifies:
  - Active document class (e.g. `IEEEtran`, `article`, `acmart`).
  - Enclosing section/subsection headers.
  - Surrounding environments (`equation`, `align`, `figure`, `table`).
  - Available citation keys and `\label` cross-references.
  - Loaded LaTeX packages (`amsmath`, `graphicx`, `cleveref`, etc.).
- LaTeX structural validator: verifies balanced curly braces, environment pairs, and math delimiters before presenting diffs.

### 5. Polished, Native-Feeling UI
- **Shadow DOM Isolation**: Renders inside an open Shadow DOM root with custom CSS resets. Overleaf's global CSS cannot break WriteTex, and WriteTex styles cannot leak into Overleaf.
- **Pixel-precise styling**: Built with Tailwind CSS configured in exact `px` units (not `rem`) to prevent font scaling issues.
- **Draggable & Minimizable**: Position the panel anywhere in your editor.
- **Floating Action Pill (FAB)**: Unobtrusive glowing `✦ WriteTex` trigger in the bottom-right corner.

### 6. Academic Presets & Keyboard-First Workflow
- One-click presets:
  - `Rewrite` — clarity and conciseness while preserving technical facts.
  - `Academic Tone` — rigorous prose suitable for peer-reviewed venues.
  - `Fix Grammar` — punctuation, spelling, and phrasing.
  - `Shorten` — trims length by ~25-30% to fit conference page limits.
  - `Expand` — deepens technical reasoning and scientific rationale.
  - `Fix LaTeX` — repairs syntax errors and unbalanced delimiters.
  - `Fix Equation` — refines mathematical notation and alignment.
  - `Explain` — explains complex equations or passages in plain English.
- Shortcuts:
  - `Ctrl + Shift + W` (Mac: `Cmd + Shift + W`) — Toggle WriteTex panel.
  - `Ctrl + Enter` (Mac: `Cmd + Enter`) — Generate AI response.
  - `Ctrl + Shift + Enter` — Apply changes to Overleaf editor.
  - `Escape` — Close panel or dismiss diff.

---

## 🛠️ Installation & Development

### 1. Build from Source

```bash
# Clone repository
git clone https://github.com/SamarthPD-21/WriteTex.git
cd WriteTex

# Install dependencies
npm install

# Run unit tests
npm test

# Build extension
npm run build
```

The extension bundle will be compiled into the `dist/` directory.

### 2. Load Extension in Google Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `dist/` directory inside this project folder:
   `/home/samarth/Desktop/Sam_N/WriteTex/dist`
5. Navigate to any project on [Overleaf](https://www.overleaf.com/project/...)!
6. Click the `✦ WriteTex` button in the bottom-right corner or press `Ctrl+Shift+W`.
7. Click the Settings icon (`⚙`) in the header to add your Gemini, OpenAI, or Claude API key.

---

## 🧪 Test Suite

Run the automated test suite with Vitest:

```bash
npm test
```

Includes unit tests for:
- Diff computation (line additions/deletions, word-level diffs, hunks).
- Fuzzy patch application via `diff-match-patch`.
- LaTeX AST parsing, citation extraction, label/ref extraction, document class detection.
- LaTeX syntax validation (balanced braces, environments, math mode).
- Prompt engineering, semantic context injection, markdown fence stripping.

---

## 📜 Architecture

```
WriteTex
├── manifest.json                  # Manifest V3 specification
├── scripts/
│   ├── build.js                   # Multi-target Vite bundler
│   └── generate-icons.js          # Pure Node.js PNG icon generator
├── src/
│   ├── adapters/
│   │   ├── types.ts               # EditorAdapter interface
│   │   └── overleaf/
│   │       ├── index.ts           # OverleafAdapter implementation
│   │       ├── cm6-bridge.ts      # MAIN world CodeMirror 6 bridge
│   │       └── dom-selectors.ts   # Overleaf DOM selectors & fallbacks
│   ├── background/
│   │   ├── service-worker.ts      # Extension service worker (MV3)
│   │   ├── ai-router.ts           # Multi-model routing
│   │   ├── key-store.ts           # Local chrome.storage.local key manager
│   │   └── providers/
│   │       ├── gemini.ts          # Google Gemini SSE streaming
│   │       ├── openai.ts          # OpenAI streaming
│   │       ├── anthropic.ts       # Claude streaming
│   │       └── stream-parser.ts   # Shared SSE stream reader
│   ├── content/
│   │   ├── index.ts               # Content script entry
│   │   ├── shadow-host.tsx        # Shadow DOM root & React mount
│   │   └── bridge-client.ts       # Bridge messaging client
│   ├── diff/
│   │   ├── compute.ts             # Line & word level diffing
│   │   ├── apply.ts               # Transactional & fuzzy patching
│   │   └── types.ts               # Diff data models
│   ├── latex/
│   │   ├── parser.ts              # unified-latex AST extractor
│   │   ├── context-builder.ts     # Enriched prompt context builder
│   │   └── validator.ts           # LaTeX syntax validator
│   ├── prompts/
│   │   ├── system.ts              # System prompts
│   │   ├── presets.ts             # Academic presets
│   │   └── builder.ts             # Prompt assembly & fence cleaner
│   └── ui/
│       ├── App.tsx                # React root & view state machine
│       ├── components/            # Panel, DiffView, ChatInput, etc.
│       ├── hooks/                 # useEditor, useAI, useSettings, etc.
│       └── styles/                # Design tokens & globals.css
```

---

## 🔒 Privacy & Security
- WriteTex operates on a **zero-cloud proxy model** for BYOK.
- Your document content is sent directly from your browser to your chosen AI provider's official API endpoint (Google Gemini, OpenAI, or Anthropic).
- No middleman server ever reads, caches, or logs your drafts or research data.
