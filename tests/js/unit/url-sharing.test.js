import { describe, it, expect } from 'vitest';
import { encodeCode, decodeCode } from '../../../lib/url-sharing.js';

describe('url-sharing', () => {
  it('round-trips ASCII code', () => {
    const code = 'import panel as pn\npn.panel("Hello").servable()';
    expect(decodeCode(encodeCode(code))).toBe(code);
  });

  it('round-trips Unicode code', () => {
    const code = '# Comment with emoji: \u{1F389}\nprint("h\u00E9llo")';
    expect(decodeCode(encodeCode(code))).toBe(code);
  });

  it('handles empty string', () => {
    expect(decodeCode(encodeCode(''))).toBe('');
  });

  it('handles multi-line code', () => {
    const code = 'import panel as pn\nimport numpy as np\n\ndata = np.random.rand(10)\npn.panel(data).servable()';
    expect(decodeCode(encodeCode(code))).toBe(code);
  });

  it('handles special characters', () => {
    const code = 'x = {"key": "value<>&\\""}';
    expect(decodeCode(encodeCode(code))).toBe(code);
  });
});
