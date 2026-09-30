# WriteTex — AI Copilot for LaTeX Resumes & Cover Letters in Overleaf

> **WriteTex** is a Chrome extension that tailors LaTeX resumes and cover letters to a specific job, directly inside Overleaf. You describe the change, review an exact diff, and apply it to your document with one click. Nothing is copied back and forth.

---

## ✦ Features

### 1. Review-first editing: what you see is what gets applied
- Every change goes through a single **edit plan**: *AI proposes → you review the exact diff → WriteTex applies*.
- The review screen tells you **where the edit lands**, e.g. *“Rewrites 2 bullets in ‘Experience’ · lines 10–12”*, with:
  - Line and word-level highlighting, and long unchanged stretches collapsed.
  - Warnings when the output was cut off by the model’s length limit, or when the edit would introduce a LaTeX error.
  - **Apply**, **Discard**, **Edit** (tweak the text before applying) and **Use selection** (retarget the change at your current selection).
- Answers to questions (“What does `\resumeSubheading` take?”) are shown as answers and are **never written into your document**.

### 2. Smart placement: no selection needed
When nothing is selected, WriteTex works out what the model rewrote and replaces only that:
- **Sections**: `\section{Projects}` replaces your “Selected Projects” section instead of adding a duplicate. A missing section is inserted in the usual order (Summary → Education → Experience → Projects → Skills).
- **Entries**: jobs and projects (`\resumeSubheading`, `\resumeProjectHeading`, `\cventry`) are matched by company or project name, so rewriting one job never touches another.
- **Bullets and paragraphs**: only the bullets or cover-letter paragraphs that changed are replaced. Untouched ones in between are kept exactly as written.
- It refuses to guess when a match is ambiguous, and refuses partial or cut-off full-document output.

### 3. Safe writes into Overleaf’s editor
- Edits go straight into Overleaf’s **CodeMirror 6** editor, so real-time collaboration and `Ctrl+Z` keep working.
- **Compare-and-swap:** right before writing, WriteTex re-finds the target text in the live document. If you typed elsewhere in the meantime, the edit still lands in the right place. If the target text itself changed, it refuses instead of overwriting your work.
- **Minimal changes:** only the characters that actually differ are sent to the editor, so collaborators and your cursor are barely affected.
- **Multi-level undo** that also survives edits you make afterwards.

### 4. Tailoring for a specific job
- **Target job**: set the company, role and job description once per Overleaf project. It’s saved per project and kept across reloads.
- **Keyword gap analysis**: shows which job-description keywords your document already covers and which are missing, most important first. It recognises common spellings (Postgres/PostgreSQL, K8s/Kubernetes, NodeJS/Node.js) and ignores boilerplate like “EEO”, “PTO” or “R&D”.
- The missing keywords are passed to the model with a strict instruction to add them **only where your real experience supports them**.
- **No invented facts**: existing numbers are kept word for word. Where a metric would help, the model adds a marked placeholder such as `\textbf{[X\%]}` for you to fill in, rather than inventing one.

### 5. ATS check
- A live **ATS readiness score** (0–100) for the open resume, split into four parts:

  | Part | Weight | What it checks |
  | --- | --- | --- |
  | Keyword match | 35% | Job-description coverage (required skills count more) and whether your target title appears |
  | Parseability | 25% | LaTeX-specific problems: missing `\pdfgentounicode`/`glyphtounicode` (PDF text copies out garbled), icon fonts, images, multi-column layouts, compile errors |
  | Sections & contact | 15% | Standard headings (Experience, Education, Skills), plus email, phone and LinkedIn in the header |
  | Content quality | 25% | Action-verb openers, share of bullets with numbers, weak phrasing (“responsible for”), overly long bullets, overall length, unfilled `[X%]` placeholders |

- Without a job description, keywords are skipped and the other three parts are reweighted.
- Every deduction comes with an explanation. Most have a one-click fix: an AI rewrite (weak openers, missing metrics, missing keywords) or a reviewed, no-AI patch (adding the unicode mapping to the preamble). Any critical issue caps the rating at “Needs work”.
- It’s an estimate: real ATS products (Workday, Greenhouse, Lever…) differ. It targets the steps they share, namely PDF text extraction, section detection and keyword matching.

### 6. GitHub-grounded projects
- Paste a GitHub profile or repo URL. WriteTex ranks your repositories for the target role and reads their verified tech stack and dependencies.
- **Write Projects section** (AI), **Facts only** (a plain section built only from repository data, no AI), and **Sync skills**.
- Tech stacks in project headings are capped at 3–4 core technologies, and frameworks your code doesn’t use are never added.

### 7. Cover letters
- Switch to **Cover letter** mode (it’s picked automatically from file names like `cover_letter.tex`).
- Presets to draft a full letter, an opening, a STAR evidence story or a closing, and to adjust tone.
- The model states facts about the company only if they appear in the job description or your attached files.

### 8. Compile-error help
- Reads the errors from Overleaf’s log. **Fix LaTeX** also checks the file itself for broken macros, unbalanced braces and unclosed environments.
- **Quick repair** fixes common damage (missing backslashes, truncated preamble lines) without AI, and shows the result for review first. **Fix with AI** handles everything else.

### 9. Reference files
- Attach PDF, TXT, MD or TEX files (an old resume, a job posting, notes). A job posting can be used as the target job description in one click.

### 10. Bring your own key
| Provider | Models |
| --- | --- |
| Anthropic Claude | Claude Opus 5, Claude Sonnet 5, Claude Haiku 4.5 |
| Google Gemini | Gemini Flash family (default) |
| OpenAI | GPT and o-series models |
| Meta | Meta Spark / Llama |

- Any other model ID can be entered under **Settings → Custom model ID**.
- Streaming output with a working **Stop** button that cancels the request. Rate limits and overloads are retried automatically.
- The fixed system prompt is sent with Anthropic’s prompt caching. Claude Opus 5 requests include Anthropic’s automatic refusal fallback.

### Keyboard shortcuts
| Keys | Action |
| --- | --- |
| `Ctrl + Shift + W` (Mac: `Cmd + Shift + W`) | Open or close the panel |
| `Ctrl + Enter` | Generate |
| `Ctrl + Shift + Enter` | Apply the reviewed change |
| `↑` / `↓` in an empty prompt box | Recall previous prompts |
| `Esc` (inside the panel) | Go back, or close the panel |
| `?` (inside the panel) | Show shortcuts |

---

## 🛠️ Installation & Development

### 1. Build from source

```bash
git clone https://github.com/SamarthPD-21/WriteTex.git
cd WriteTex
npm install

npm test          # unit tests
npm run build     # production build (minified) into dist/
npm run dev       # unminified build for debugging
node scripts/generate-icons.js   # re-render icons & store art from assets/brand/*.svg (needs rsvg-convert)
```

### 2. Load the extension in Chrome

1. Open `chrome://extensions/` and turn on **Developer mode**.
2. Click **Load unpacked** and choose the `dist/` folder of this project.
3. Open any project on [Overleaf](https://www.overleaf.com/). WriteTex only runs on project pages, and its toolbar button is greyed out elsewhere.
4. Click the `✦ WriteTex` button in the bottom-right corner, or press `Ctrl+Shift+W`.
5. Open Settings (`⚙`) and add an API key for your provider.

After rebuilding, click **Reload** on the extension card and refresh the Overleaf tab.

---

## 🧪 Test Suite

```bash
npm test
```

Vitest covers:
- **Placement engine**: section, entry, bullet and paragraph matching and merging; fuzzy snippet location; refusal of ambiguous or cut-off output.
- **Edit plans**: selection edits, rebasing onto a changed document, refusing to overwrite changed text, undo.
- **Providers**: SSE parsing, finish reasons (complete, truncated, refused), retries, per-model request rules.
- **LaTeX**: validation (comments, escapes, `\verb`, verbatim environments), safe auto-repair, parsing.
- **Keyword gap**: synonyms, ambiguous words, ranking by prominence.
- **ATS score**: parsing, structure and content checks, keyword weighting, the unicode-mapping patch.
- **Prompts**: context assembly, output cleaning, question vs. edit detection.
- **GitHub**: ranking, formatting and LaTeX escaping.

---

## 📜 Architecture

```
WriteTex
├── public/manifest.json              # Manifest V3
├── scripts/build.js                  # Builds background, bridge, content script, PDF extractor
├── src/
│   ├── adapters/overleaf/
│   │   ├── cm6-bridge.ts             # Runs in the page: reads CM6, compare-and-swap minimal writes
│   │   ├── index.ts                  # OverleafAdapter (snapshots, guarded edits, project id)
│   │   ├── error-scraper.ts          # Compile errors from the Overleaf log
│   │   └── dom-selectors.ts
│   ├── background/
│   │   ├── service-worker.ts         # Streams model output to the panel
│   │   ├── ai-router.ts              # Builds the prompt and picks the provider
│   │   ├── key-store.ts              # Settings + model migrations
│   │   └── providers/                # anthropic, openai, gemini, meta; http.ts (retries), stream-parser.ts
│   ├── content/                      # Content script entry, Shadow DOM host, bridge client
│   ├── diff/
│   │   ├── edit-plan.ts              # EditPlan: plan → review → rebase → apply → undo
│   │   ├── smart-replace.ts          # Figures out where model output belongs
│   │   ├── apply.ts                  # Exact / whitespace-insensitive / fuzzy snippet location
│   │   └── compute.ts                # Line & word diffs
│   ├── analysis/
│   │   ├── keyword-gap.ts            # Job-description keyword coverage
│   │   └── ats-score.ts              # ATS readiness score and fixes
│   ├── latex/                        # validator, auto-repair, parser, context-builder
│   ├── prompts/                      # system prompts, presets, builder, intent detection
│   ├── integrations/
│   │   ├── github/                   # GitHub client, ranking, facts-only LaTeX formatter
│   │   └── files/                    # Attachment extraction (PDF loaded on demand)
│   └── ui/
│       ├── App.tsx                   # View state machine and apply/undo orchestration
│       ├── components/               # Input view sections, DiffView, AnswerView, Settings…
│       └── hooks/                    # useEditor, useAI, useWorkspace, useSettings…
└── test/
```

---

## 🔒 Privacy & Security
- **Runs only on Overleaf project pages.** Content scripts match only `https://*.overleaf.com/project/*`, and the toolbar button is greyed out everywhere else. The extension has no `tabs`, `activeTab` or all-sites permission.
- Full policy: [PRIVACY.md](PRIVACY.md). Chrome Web Store listing and privacy-practice answers: [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md).
- **No middleman server.** Your document is sent straight from your browser to the AI provider you pick. WriteTex has no backend that reads, caches or logs your drafts.
- **API keys are stored unencrypted** in this browser’s extension storage (`chrome.storage.local`) and are sent only to that provider’s API. Use a key with a spending limit.
- Your target job, job description, GitHub analysis, attachments and history are stored locally per Overleaf project, in the same extension storage.
