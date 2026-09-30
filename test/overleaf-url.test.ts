import { describe, expect, it } from 'vitest';
import { isOverleafProjectUrl } from '../src/shared/overleaf-url';

describe('isOverleafProjectUrl', () => {
  it('accepts Overleaf project editors', () => {
    expect(isOverleafProjectUrl('https://www.overleaf.com/project/6aaa03cd2c634e0499bdc630')).toBe(true);
    expect(isOverleafProjectUrl('https://overleaf.com/project/abc123')).toBe(true);
  });

  it('rejects everything else', () => {
    for (const url of [
      'https://www.overleaf.com/project', // project list, not an editor
      'https://www.overleaf.com/read/abcdef', // read-only share link
      'https://www.overleaf.com/learn/latex',
      'http://www.overleaf.com/project/abc123', // not https
      'https://evil.com/?next=overleaf.com/project/abc',
      'https://overleaf.com.evil.com/project/abc',
      'https://notoverleaf.com/project/abc',
      'chrome://extensions',
      undefined,
      '',
      'not a url',
    ]) {
      expect(isOverleafProjectUrl(url)).toBe(false);
    }
  });
});
