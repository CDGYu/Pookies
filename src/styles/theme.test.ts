import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'theme.css'), 'utf8');

describe('theme tokens', () => {
  it('declares the Pookies palette as CSS variables', () => {
    for (const token of [
      '--matcha-600', '--matcha-700', '--matcha-800', '--cream', '--cookie-100',
      '--cocoa', '--taupe', '--sand', '--mint', '--mint-border',
      '--alert', '--alert-bg', '--critical', '--critical-bg',
    ]) {
      expect(css).toContain(token);
    }
  });
});
