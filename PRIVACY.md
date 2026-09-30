# WriteTex Privacy Policy

**Effective date:** September 30, 2026
**Applies to:** the WriteTex browser extension (version 0.3.0 and later)

WriteTex is a browser extension that helps you edit LaTeX resumes and cover letters inside Overleaf. It has **no servers of its own**. This policy explains what data the extension handles, where it goes, and the choices you have.

## Summary

- WriteTex runs **only on Overleaf project pages** (`https://*.overleaf.com/project/…`). It does not read or change any other website.
- The developer **does not collect, receive, store, or sell** any of your data. There are no analytics, tracking, advertising, or crash-reporting services.
- When you ask WriteTex to do something, the relevant document text is sent **directly from your browser** to the AI provider **you** chose (Anthropic, Google, OpenAI, or Meta), using **your** API key.
- Settings, API keys, and your saved work are kept **locally in your browser**.

## What WriteTex handles, and where it goes

| Data | When | Where it goes | Kept where / how long |
| --- | --- | --- | --- |
| **Text of the Overleaf file you have open** (resumes usually include your name, email, phone number, work history, and education) | Only when you click **Generate**, or use a fix or preset | Sent over HTTPS to the AI provider you selected, to produce the edit | Not stored by WriteTex beyond the saved history below. The provider’s own policy governs what it retains. |
| **Your selection, cursor position, and file name** | While the panel is in use | Stays in your browser. It is included in the request above only when you generate. | Not stored |
| **Target company, role, job description, attached files** (PDF, TXT, MD, TEX) | When you enter or attach them | Stored locally. Sent to your AI provider as context when you generate. | `chrome.storage.local`, per Overleaf project, until you clear it |
| **Request history** (your prompts and the model’s output) | After each generation | Stays in your browser | `chrome.storage.local`, per project, last 25 entries, until you clear it |
| **GitHub username or repository URL** | Only if you use the GitHub feature | Sent to the public GitHub API (`api.github.com`) to read public repository information | The analysis result is saved locally with your project data |
| **AI provider API keys** | When you enter them in Settings | Sent only to that provider’s API, as authentication | `chrome.storage.local`. **Not encrypted.** Removed if you delete the key or uninstall the extension. |
| **Panel position and size** | When you move or resize the panel | Stays in your browser | Overleaf page `localStorage` |

WriteTex reads Overleaf’s compile-log messages on the page to show and fix LaTeX errors. That data stays in your browser unless you choose **Fix with AI**, in which case the error messages are included in the request to your AI provider.

## Third parties

WriteTex talks only to the services below, and only when you use a feature that needs them:

- **Anthropic**: `api.anthropic.com` ([privacy policy](https://www.anthropic.com/legal/privacy))
- **Google Gemini**: `generativelanguage.googleapis.com` ([privacy policy](https://policies.google.com/privacy))
- **OpenAI**: `api.openai.com` ([privacy policy](https://openai.com/policies/privacy-policy))
- **Meta**: `api.meta.ai` ([privacy policy](https://www.facebook.com/privacy/policy))
- **GitHub**: `api.github.com` ([privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement))

Requests to AI providers use **your** account and API key, so the provider’s terms and data-retention settings for your account apply. The developer of WriteTex has no access to these requests.

## What WriteTex does not do

- It does not collect browsing history or run on sites other than Overleaf project pages.
- It does not sell or transfer user data to third parties, except to the AI provider or GitHub at your request as described above.
- It does not use or transfer user data for purposes unrelated to its single purpose: editing and tailoring LaTeX documents in Overleaf.
- It does not use or transfer user data to determine creditworthiness or for lending purposes.
- It does not load or run remotely hosted code. All code ships inside the extension package.

The use of information received from Chrome APIs complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Your choices

- **Clear project data:** WriteTex Settings → *This project* → **Clear saved data** removes the target job, job description, GitHub analysis, attachments, and history for that project.
- **Remove an API key:** delete it in WriteTex Settings.
- **Remove everything:** uninstalling the extension deletes all of its local storage.
- **Choose what is sent:** nothing is sent to an AI provider until you click Generate or a fix. Selecting text first limits the request to that text plus light document context.

## Security

All network requests use HTTPS. API keys are stored in the browser’s extension storage, which other websites cannot read, but they are **not encrypted** at rest. Use provider keys with spending limits, and revoke a key from the provider’s dashboard if you think it was exposed.

## Children

WriteTex is not directed at children under 13 and does not knowingly process their data.

## Changes

If this policy changes, the new version will be published at the same location with a new effective date. Material changes will also be noted in the extension’s release notes.

## Contact

Questions or requests: open an issue at <https://github.com/SamarthPD-21/WriteTex/issues>.
