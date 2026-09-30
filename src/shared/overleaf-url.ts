/**
 * WriteTex only runs inside Overleaf project editors. This is the single check
 * used by the service worker (before injecting or toggling) and by the content
 * scripts (before mounting), so the rule can't drift between them.
 */
export function isOverleafProjectUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  const isOverleafHost = host === 'overleaf.com' || host.endsWith('.overleaf.com');
  return parsed.protocol === 'https:' && isOverleafHost && /^\/project\/[A-Za-z0-9]+\/?$/.test(parsed.pathname);
}
