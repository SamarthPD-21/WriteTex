<p align="center">
  <img src="public/icons/icon-128.png" alt="WriteTex Logo" width="80" />
</p>

<h1 align="center">WriteTex</h1>

<p align="center">
  <strong>AI Copilot for LaTeX & Overleaf</strong>
  <br />
  <em>Edit, tailor, and debug LaTeX documents without ever leaving your editor.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/React_18-Shadow_DOM-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Tests-76_passing-22C55E?logo=vitest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/Version-0.2.0-8B5CF6" alt="Version" />
</p>

---

**WriteTex** is a Chrome extension that embeds an AI copilot directly inside the [Overleaf](https://www.overleaf.com) LaTeX editor. It reads your document, understands its structure, and writes back changes through Overleaf's native CodeMirror 6 engine — no copy-paste, no context switching, and no external servers.

## Table of Contents

- [Key Capabilities](#-key-capabilities)
- [Supported AI Models](#-supported-ai-models)
- [Getting Started](#-getting-started)
- [Feature Deep Dives](#-feature-deep-dives)
- [Architecture](#-architecture)
- [Test Suite](#-test-suite)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Privacy & Security](#-privacy--security)
- [License](#-license)

---

## ✦ Key Capabilities

| Category | What it does |
|---|---|
| **Native Editor Integration** | Dispatches changes via `view.dispatch()` into CodeMirror 6, triggering Overleaf's real-time OT sync, undo history, and co-author broadcast. |
| **Git-Style Diff Review** | Color-coded unified diffs with word-level highlights, line numbers, `+N / -N` stats, and **Apply / Reject / Edit** controls. |
| **Resume & Cover Letter Tailoring** | One-click role presets (SWE, AI/ML, Full Stack, PM, DevOps, Quant, Security, Eng Manager) using Google's XYZ formula with strict anti-hallucination. |
| **GitHub Portfolio Analyzer** | Scans your GitHub profile, reads `package.json` / `requirements.txt` / `pom.xml`, ranks projects by target role, and generates LaTeX `\resumeProjectHeading` blocks. |
| **JD Keyword Gap Engine** | Compares your resume against a Job Description, shows match %, and offers 1-click "Tailor Resume to Fill Missing Keywords". |
| **Compiler Diagnostics** | Scrapes Overleaf's error log, detects "No PDF" failures, and fixes truncated macros with a 1-click auto-repair engine. |
| **File Attachments** | Drag-and-drop PDF, TXT, BibTeX, or `.tex` files into the prompt as reference documents — client-side extraction via `unpdf`. |
| **Multi-Format Export** | Export any AI result as raw `.tex`, GitHub-flavored Markdown, or plain text with 1-click download. |
| **Template Library** | Bundled templates: Jake's Resume (ATS industry standard), Modern Executive Cover Letter, and Academic/Postdoc CV. |
| **BYOK Privacy** | Bring-Your-Own-Key model. Your documents go directly from browser → AI provider API. Zero intermediary servers. |

---

## 🤖 Supported AI Models

WriteTex connects directly to 4 AI providers. You supply your own API key; no middleman.

### Google Gemini
| Model | Tag | Context |
|---|---|---|
| **Gemini 3.8 Flash** | Recommended | 1M tokens |
| Gemini 3.6 Flash | Fast | 1M tokens |
| Gemini 3.5 Flash | Efficient | 1M tokens |
| Gemma 3 31B IT | Open Weights | 128K tokens |
| Gemini 2.5 Pro | Reasoning | 1M tokens |
| Gemini 2.5 Flash | Latest 2.x | 1M tokens |
| Gemini 2.0 Flash | Fast 2.x | 1M tokens |
| Gemini 2.0 Flash Lite | Sub-200ms | 1M tokens |

### OpenAI
| Model | Tag |
|---|---|
| **GPT-4o** | Recommended |
| GPT-4o mini | Efficient |
| o3-mini | STEM Reasoning |

### Anthropic Claude
| Model | Tag |
|---|---|
| **Claude 3.7 Sonnet** | Recommended / Hybrid Reasoning |
| Claude 3.5 Sonnet | Best Prose |
| Claude 3.5 Haiku | Fast / Efficient |

### Meta AI
| Model | Tag |
|---|---|
| **Meta Spark 1.3** | Recommended |
| Meta Spark 1.2 | Fast |
| Llama 3.3 70B | Efficient / Open |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- Google Chrome (or any Chromium browser)

### Build from Source

```bash
git clone https://github.com/SamarthPD-21/WriteTex.git
cd WriteTex

npm install      # Install dependencies
npm test         # Run 76 unit tests across 11 suites
npm run build    # TypeScript check + Vite production bundle → dist/
```

### Load in Chrome

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. Open any project on [Overleaf](https://www.overleaf.com)
5. Click the glowing **✦ WriteTex** pill in the bottom-right, or press `Ctrl+Shift+W`
6. Open **Settings** (⚙) and enter your API key for Gemini, OpenAI, Claude, or Meta

---

## 🔬 Feature Deep Dives

### Native CodeMirror 6 Integration

WriteTex injects a `bridge.js` script into Overleaf's `MAIN` world to access the live CodeMirror 6 `EditorView` instance. When you click **Apply**:

1. The replacement text is diffed against the current buffer.
2. A `view.dispatch({ changes: { from, to, insert } })` transaction is executed.
3. Overleaf's ShareJS/OT layer automatically syncs the change to collaborators.
4. The edit registers in `Ctrl+Z` undo history natively.
5. A read-back verification confirms the buffer matches the intended output.

### Resume & Cover Letter Intelligence

WriteTex includes dedicated system prompts for three document modes:

- **Resume Optimizer** — Google XYZ formula, assertive action verbs, strict 3-4 keyword limits on project headings, anti-keyword-stuffing in bullets, zero-hallucination policy for GitHub projects.
- **Cover Letter Architect** — STAR-framework paragraphs (Hook → Evidence → Culture Fit → CTA), company-specific customization.
- **LaTeX Debugger** — Compiler error resolution, truncated macro repair, preamble restoration.

**Role Presets** tailor content for specific careers with one click:

```
💻 Software Engineer    🧠 AI / ML Engineer     🌐 Full Stack
🚀 Product Manager      📊 Data Scientist       📈 Quant / Finance
☁️ DevOps / Cloud        🛡️ Cybersecurity        👔 Eng Manager
```

**Action Presets** apply targeted transformations:

```
📈 Quantify with Metrics    💪 Assertive Action Verbs    📐 Google XYZ Formula
📄 Condense for 1-Page      🔍 ATS Keyword Optimizer     📋 Skills Matrix Polish
🛠 Fix LaTeX Errors          📑 Restore Preamble          🐙 Auto-Add GitHub Projects
⚡ Sync GitHub Skills
```

### GitHub Portfolio Analyzer

1. Enter a GitHub URL or `@username` in the GitHub Intelligence Hub.
2. WriteTex paginates through **all public repositories** (up to 200 repos).
3. For top candidates, it fetches manifest files via `raw.githubusercontent.com`:
   - `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`
   - First 1,000 chars of `README.md`
4. Extracts **verified tech stacks** and **manifest dependencies** — zero guessing.
5. Ranks projects against the target role using multi-signal scoring (language match, topic relevance, stars/forks, JD keywords, complexity heuristics).
6. Generates `\resumeProjectHeading` LaTeX blocks with strict 3-4 core technology headings.

### JD Keyword Gap Analysis

The keyword gap engine maintains a curated dictionary of 150+ high-signal technical keywords across:
- Languages, Frontend, Backend, Cloud/DevOps, Databases, AI/ML, and System Design

It computes a **match percentage** between the Job Description and your resume, displays matched skills (green) vs. missing skills (amber), and generates a 1-click prompt: *"Tailor Resume to Fill Missing Keywords"*.

### Compiler Diagnostics & Auto-Repair

WriteTex scrapes Overleaf's DOM for compilation errors, "No PDF" indicators, and raw log entries. The auto-repair engine fixes:
- Truncated package declarations (`e{latexsym}` → `\usepackage{latexsym}`)
- Missing backslashes on resume macros (`sumeItem{` → `\resumeItem{`)
- Bracket/brace mismatches (`\underline[...]` → `\underline{...}`)
- Corrupted preambles — restores the full Jake's Resume preamble when needed

### LaTeX Semantic Intelligence

Powered by the `@unified-latex` AST parser, WriteTex enriches every prompt with:
- Active document class (`article`, `IEEEtran`, `acmart`)
- Enclosing section/subsection headers
- Surrounding environments (`equation`, `align`, `figure`, `table`)
- Available `\cite` keys and `\label` cross-references
- Loaded packages (`amsmath`, `graphicx`, `cleveref`, etc.)

---

## 📐 Architecture

```
WriteTex/
├── public/
│   └── manifest.json                   # Chrome MV3 manifest
├── scripts/
│   ├── build.js                        # Multi-target Vite bundler (3 entries)
│   └── generate-icons.js              # PNG icon generator
├── src/
│   ├── adapters/
│   │   ├── types.ts                    # EditorAdapter interface
│   │   └── overleaf/
│   │       ├── cm6-bridge.ts          # MAIN world CodeMirror 6 bridge
│   │       ├── dom-selectors.ts       # Overleaf DOM selectors & fallbacks
│   │       ├── error-scraper.ts       # Compilation log & "No PDF" scraper
│   │       └── index.ts              # OverleafAdapter lifecycle
│   ├── analysis/
│   │   └── keyword-gap.ts            # JD ↔ Resume keyword gap engine
│   ├── background/
│   │   ├── service-worker.ts          # MV3 service worker & port router
│   │   ├── ai-router.ts              # Multi-provider streaming dispatcher
│   │   ├── key-store.ts              # Encrypted API key manager
│   │   └── providers/
│   │       ├── gemini.ts             # Google Gemini SSE streaming
│   │       ├── openai.ts            # OpenAI SSE streaming
│   │       ├── anthropic.ts         # Claude SSE streaming
│   │       ├── meta.ts              # Meta AI streaming
│   │       └── stream-parser.ts     # Shared SSE chunk parser
│   ├── content/
│   │   ├── index.ts                   # Content script entry
│   │   ├── shadow-host.tsx           # Shadow DOM root & React mount
│   │   └── bridge-client.ts         # Bridge messaging client
│   ├── diff/
│   │   ├── compute.ts                # Line & word-level diffing
│   │   ├── apply.ts                  # Transactional & fuzzy patching
│   │   ├── smart-replace.ts         # Semantic section replacement engine
│   │   └── types.ts                  # Diff data models
│   ├── integrations/
│   │   ├── files/
│   │   │   ├── extractor.ts         # PDF/TXT/BibTeX client-side extraction
│   │   │   └── types.ts             # Attachment types
│   │   └── github/
│   │       ├── client.ts            # GitHub API client with caching
│   │       ├── ranker.ts            # Role-based project ranker
│   │       ├── formatter.ts         # LaTeX project formatter
│   │       ├── url-parser.ts        # GitHub URL parser
│   │       └── types.ts             # GitHub data types
│   ├── latex/
│   │   ├── parser.ts                 # @unified-latex AST extractor
│   │   ├── context-builder.ts       # Enriched prompt context builder
│   │   ├── validator.ts             # Syntax validator (braces, envs, math)
│   │   └── auto-repair.ts          # Broken macro & preamble repair
│   ├── messaging/
│   │   ├── types.ts                  # Message schemas & model catalog
│   │   └── runtime.ts               # chrome.runtime messaging helpers
│   ├── prompts/
│   │   ├── system.ts                 # System prompts (Resume, CL, Debug)
│   │   ├── presets.ts               # Role, action & CL preset library
│   │   └── builder.ts              # Dynamic prompt assembly
│   ├── templates/
│   │   └── latex-templates.ts       # Curated template library
│   ├── ui/
│   │   ├── App.tsx                   # React root & view state machine
│   │   ├── components/
│   │   │   ├── ChatInput.tsx        # Main copilot control panel
│   │   │   ├── DiffView.tsx         # Unified diff review modal
│   │   │   ├── EditView.tsx         # Manual edit-before-apply view
│   │   │   ├── StreamingView.tsx    # Real-time streaming display
│   │   │   ├── ModelSelector.tsx    # Provider & model dropdown
│   │   │   ├── KeywordGapView.tsx   # ATS keyword match gauge
│   │   │   ├── SettingsView.tsx     # BYOK API key configuration
│   │   │   ├── Panel.tsx            # Draggable glassmorphism panel
│   │   │   ├── FloatingButton.tsx   # Glowing FAB pill trigger
│   │   │   ├── FileAttachmentList.tsx # File upload & chip list
│   │   │   ├── TemplateLibraryModal.tsx # Template browser
│   │   │   ├── ShortcutsModal.tsx   # Keyboard shortcuts dialog
│   │   │   ├── KeyboardShortcutHint.tsx
│   │   │   └── Toast.tsx            # Notification toasts
│   │   ├── hooks/
│   │   │   ├── useAI.ts             # AI streaming & abort hook
│   │   │   ├── useEditor.ts        # CM6 bridge hook
│   │   │   ├── useSettings.ts      # Settings persistence hook
│   │   │   ├── usePanelPosition.ts # Drag position hook
│   │   │   └── usePanelResize.ts   # Edge resize hook
│   │   └── styles/
│   │       ├── globals.css          # Tailwind base & glassmorphism
│   │       └── tokens.ts           # Design tokens & palette
│   └── utils/
│       └── export.ts                # LaTeX → Plain Text / Markdown export
└── test/
    ├── diff.test.ts                  # Diff computation tests
    ├── error-scraper.test.ts        # Overleaf error scraping tests
    ├── export.test.ts               # Export format tests
    ├── file-extractor.test.ts       # File extraction tests
    ├── github.test.ts               # GitHub parser, ranker & formatter
    ├── keyword-gap.test.ts          # Keyword gap analysis tests
    ├── latex.test.ts                # AST, validator & auto-repair tests
    ├── models.test.ts               # Model catalog tests
    ├── prompts.test.ts              # Prompt builder tests
    ├── smart-replace.test.ts        # Semantic replacement tests
    └── templates.test.ts            # Template library tests
```

### Build Pipeline

The project uses a custom multi-target Vite bundler (`scripts/build.js`) that produces three output files:

| Entry | Output | Description |
|---|---|---|
| `src/background/service-worker.ts` | `dist/background.js` | MV3 service worker (AI routing, key management) |
| `src/adapters/overleaf/cm6-bridge.ts` | `dist/bridge.js` | MAIN world CM6 bridge (6 KB) |
| `src/content/index.ts` | `dist/content.js` | Content script (React UI in Shadow DOM) |

---

## 🧪 Test Suite

```bash
npm test
```

**76 tests** across **11 test suites**, all passing:

| Suite | Tests | Coverage |
|---|---|---|
| `diff.test.ts` | 6 | Line/word diffs, hunk boundaries, stats |
| `error-scraper.test.ts` | 5 | DOM scraping, "No PDF" detection, log parsing |
| `export.test.ts` | 2 | LaTeX → Plain Text, LaTeX → Markdown |
| `file-extractor.test.ts` | 8 | File type detection, size formatting, attachments |
| `github.test.ts` | 16 | URL parser, role ranker, LaTeX formatter, zero-hallucination |
| `keyword-gap.test.ts` | 3 | Keyword extraction, match %, suggestions |
| `latex.test.ts` | 8 | AST parsing, validation, context builder, auto-repair |
| `models.test.ts` | 4 | Model catalog consistency, provider defaults |
| `prompts.test.ts` | 12 | Prompt builder, modes, keyword limits, anti-stuffing |
| `smart-replace.test.ts` | 10 | Fuzzy locator, section classification, semantic placement |
| `templates.test.ts` | 2 | Template structure, snippet verification |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+W` | Toggle WriteTex panel |
| `Ctrl+Enter` | Generate AI response |
| `Ctrl+Shift+Enter` | Apply changes to editor |
| `Escape` | Close panel / dismiss diff |
| `↑` / `↓` | Navigate prompt history |
| `?` | Open shortcuts cheat sheet |

> **macOS**: Replace `Ctrl` with `Cmd`.

---

## 🔒 Privacy & Security

WriteTex operates on a **zero-cloud-proxy, Bring-Your-Own-Key** model:

- **No intermediate server.** Your document content travels directly from your browser to your chosen AI provider's official API endpoint (Google, OpenAI, Anthropic, or Meta).
- **No telemetry.** WriteTex collects zero analytics, usage data, or document content.
- **Local key storage.** API keys are stored in `chrome.storage.local` and never leave your machine.
- **Shadow DOM isolation.** WriteTex's UI renders inside an isolated Shadow DOM root — Overleaf's CSS cannot interfere, and WriteTex styles cannot leak into Overleaf.
- **Minimal permissions.** Only `storage`, `activeTab`, `scripting`, and `tabs` — no `<all_urls>`, no background network access beyond the AI provider endpoints.

---

## 📄 License

This project is currently private. See `package.json` for details.

---

<p align="center">
  Built with ❤️ for researchers, engineers, and anyone who writes in LaTeX.
</p>
