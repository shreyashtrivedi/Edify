/**
 * Makes text safe for the PDF's built-in fonts (Helvetica / Courier).
 *
 * Built-in PDF fonts need no download, but they only contain the Western "WinAnsi" character
 * set: letters with accents, curly quotes and dashes, but no arrows, Greek letters or emoji.
 * AI text regularly contains those, and they would come out as garbage. So we convert them
 * to readable ASCII first ("→" becomes "->", "π" becomes "pi") and drop emoji.
 */
const REPLACEMENTS = {
  '→': '->', '←': '<-', '↔': '<->', '⇒': '=>', '⇐': '<=', '⇔': '<=>', '↑': '^', '↓': 'v',
  '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~', '−': '-', '∞': 'infinity', '√': 'sqrt',
  '✓': '[x]', '✔': '[x]', '✗': 'x', '✘': 'x', '★': '*', '☆': '*',
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', Δ: 'Delta', ε: 'epsilon', θ: 'theta',
  λ: 'lambda', μ: 'µ', π: 'pi', σ: 'sigma', Σ: 'Sigma', ω: 'omega', Ω: 'Omega',
  '\u00a0': ' ', '\t': '  ', '\u200b': '',
};

// Everything the WinAnsi encoding can show: printable ASCII, Latin-1, and its extra punctuation.
const WIN_ANSI = /[\n\r\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

export function pdfText(text = '') {
  let result = '';
  for (const char of String(text).replace(EMOJI, '')) {
    if (WIN_ANSI.test(char)) result += char;
    else if (char in REPLACEMENTS) result += REPLACEMENTS[char];
    else {
      // Last resort: strip accents the font lacks ("ā" → "a"), otherwise show "?"
      const base = char.normalize('NFKD').replace(/[̀-ͯ]/g, '');
      result += base && [...base].every((c) => WIN_ANSI.test(c)) ? base : '?';
    }
  }
  return result;
}
