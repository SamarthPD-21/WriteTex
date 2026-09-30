# Chrome Web Store Submission — WriteTex

Everything needed to fill in the Chrome Web Store Developer Dashboard for WriteTex **0.3.0**. Copy each block into the matching field.

---

## 1. Store listing

| Field | Value |
| --- | --- |
| **Name** | WriteTex — AI resume & cover letter copilot for Overleaf |
| **Short name** | WriteTex |
| **Category** | Productivity → Tools |
| **Language** | English |
| **Pricing** | Free. Bring your own AI provider API key. |
| **Homepage** | https://github.com/SamarthPD-21/WriteTex |
| **Support** | https://github.com/SamarthPD-21/WriteTex/issues |
| **Privacy policy URL** | https://github.com/SamarthPD-21/WriteTex/blob/main/PRIVACY.md |

### Summary (≤ 132 characters, 119 used)

```
Tailor LaTeX resumes and cover letters to any job, check ATS readiness, and apply reviewed edits right inside Overleaf.
```

### Description

```
WriteTex is an AI copilot for LaTeX resumes and cover letters that works right inside Overleaf. Describe the change you want, review an exact diff, and apply it to your document with one click. No copying LaTeX back and forth.

TAILOR TO A JOB
• Paste a job description to see which keywords your resume already covers and which are missing, most important first.
• WriteTex adds missing skills only where your real experience supports them. Your existing numbers are kept word for word, and missing metrics become clearly marked placeholders instead of invented figures.

ATS CHECK
• A live ATS readiness score covering keyword match, parseability, sections and contact details, and content quality.
• Catches LaTeX-specific problems generic checkers miss, such as PDFs whose text copies out garbled, icon fonts, and multi-column layouts. Most issues have a one-click fix.

REVIEW EVERY CHANGE
• Every edit is shown as a diff before it touches your document, with a note on exactly where it lands (for example, “Rewrites 2 bullets in Experience”).
• Nothing is ever applied without your click. Questions get answers, not edits.

SAFE, PRECISE EDITS
• With no selection, WriteTex finds the right section, job entry, or bullet to change and leaves everything else exactly as written.
• If you edit the same text while reviewing, WriteTex refuses to overwrite your work. Only the changed characters are written, so co-authors and Overleaf’s history see a minimal change.
• Multi-level undo.

MORE
• Cover letter mode with STAR stories and tone presets.
• GitHub-grounded project bullets based on your real repositories.
• Compile-error help: a quick no-AI repair plus “Fix with AI”.
• Attach an old resume, job posting, or notes (PDF, TXT, MD, TEX).

YOUR KEY, YOUR DATA
• Works with Claude (Anthropic), Gemini (Google), OpenAI, or Meta using your own API key.
• No WriteTex servers: requests go straight from your browser to the provider you choose. No analytics or tracking.
• Runs only on Overleaf project pages.

Keyboard: Ctrl+Shift+W opens the panel, Ctrl+Enter generates, Ctrl+Shift+Enter applies.
```

### Graphic assets

| Asset | Size | File |
| --- | --- | --- |
| Store icon | 128×128 | `store/store-icon-128.png` |
| Small promo tile | 440×280 | `store/promo-small-440x280.png` |
| Screenshots (1–5) | 1280×800 | **To capture:** open panel, review diff, ATS check, Settings |

Regenerate the icon and tile from the SVG masters in `assets/brand/` with `node scripts/generate-icons.js`.

---

## 2. Privacy practices tab

### Single purpose

```
WriteTex helps users edit and tailor LaTeX resumes and cover letters in the Overleaf editor: it proposes AI-generated edits, shows them as a diff for review, and applies approved edits to the open Overleaf document.
```

### Permission justifications

| Permission | Justification to paste |
| --- | --- |
| `storage` | Saves the user’s settings (AI provider, model, API key) and per-project work (target job, job description, history) locally with chrome.storage.local, so they persist between sessions. Nothing is synced to any server. |
| `scripting` | When the user opens WriteTex on an Overleaf project tab that was already open before the extension was installed or updated, injects the extension’s own packaged scripts into that Overleaf tab. It is used only on Overleaf project URLs. |
| Host `https://*.overleaf.com/*` | The extension’s core function: reading the open LaTeX document and selection in the Overleaf editor, and writing the edits the user approves. |
| Host `https://api.anthropic.com/*` | Sends the user’s request directly to Anthropic’s API with the user’s own key, when the user selects Claude. |
| Host `https://generativelanguage.googleapis.com/*` | Sends the user’s request directly to Google’s Gemini API with the user’s own key, when the user selects Gemini. |
| Host `https://api.openai.com/*` | Sends the user’s request directly to OpenAI’s API with the user’s own key, when the user selects OpenAI. |
| Host `https://api.meta.ai/*` | Sends the user’s request directly to Meta’s API with the user’s own key, when the user selects Meta. |
| Host `https://api.github.com/*` | Reads public repository information for a GitHub profile the user enters, to ground resume project bullets in real repositories. |

### Remote code

**No, I am not using remote code.** All JavaScript is bundled in the package. The PDF reader (`pdf-extractor.js`) is a packaged file loaded on demand from the extension itself, not from the network.

### Data usage: data types collected

The Web Store counts data as “collected” when it leaves the device, even when it goes to a service the user chose. Tick:

| Data type | Tick? | Why |
| --- | --- | --- |
| Personally identifiable information | ✅ | Resume text (name, email, phone, address) is sent to the user’s chosen AI provider when they generate. |
| Authentication information | ✅ | The user’s own AI provider API key is sent to that provider to authenticate their requests. |
| Website content | ✅ | The text of the open Overleaf document is sent to the user’s chosen AI provider when they generate. |
| Health, financial and payment, personal communications, location, web history, user activity | ☐ | Not collected. |

### Certifications (tick all three)

- ✅ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ✅ I do not use or transfer user data for purposes that are unrelated to my item’s single purpose.
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes.

These match `PRIVACY.md`. The only transfers are to the AI provider or GitHub, at the user’s request, to provide the extension’s single purpose.

---

## 3. Pre-submission checklist

- [ ] `npm test` and `npm run build` pass. Upload a zip of `dist/` (not the repo).
- [ ] Version bumped in `public/manifest.json` and `package.json`.
- [ ] Load `dist/` unpacked and confirm:
  - [ ] The toolbar button is **greyed out** on non-Overleaf sites, and Ctrl+Shift+W does nothing there.
  - [ ] The panel opens on an Overleaf project, and edits apply and undo.
  - [ ] The panel does **not** appear on `overleaf.com/project` (project list), `/read/` links, or `/learn`.
- [ ] `PRIVACY.md` is published at the privacy policy URL above.
- [ ] Screenshots captured at 1280×800.
- [ ] Test account notes for reviewers: “Requires the reviewer’s own AI API key; open any Overleaf project, press Ctrl+Shift+W.”

## 4. Overleaf-only enforcement (for reviewers)

WriteTex is restricted to Overleaf project editors in four layers:
1. **Manifest:** content scripts match only `https://*.overleaf.com/project/*`. There is no `<all_urls>`, `tabs`, or `activeTab` permission.
2. **Toolbar button:** greyed out on every tab that isn’t an Overleaf project (`chrome.action.disable(tabId)` on tab create/update). Without `tabs`, the worker sees URLs only for Overleaf tabs, so every other tab is treated as “not a project”.
3. **Service worker:** the shortcut and button handlers check the tab URL (`isOverleafProjectUrl`, HTTPS, an `overleaf.com` host, and a `/project/<id>` path) before messaging or injecting anything.
4. **Content scripts:** both the UI script and the editor bridge re-check the page URL and exit early elsewhere.
