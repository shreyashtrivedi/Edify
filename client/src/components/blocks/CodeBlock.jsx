import { Check, Copy } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import { useState } from 'react';

// prism-react-renderer bundles common languages; map aliases / unsupported ones.
const LANGUAGE_ALIASES = {
  js: 'javascript',
  node: 'javascript',
  ts: 'typescript',
  py: 'python',
  html: 'markup',
  xml: 'markup',
  'c++': 'cpp',
  java: 'clike',
  csharp: 'clike',
  'c#': 'clike',
  php: 'clike',
  kotlin: 'kotlin',
};
const SUPPORTED = new Set([
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'python',
  'markup',
  'css',
  'json',
  'yaml',
  'sql',
  'graphql',
  'markdown',
  'go',
  'rust',
  'cpp',
  'c',
  'swift',
  'kotlin',
  'objectivec',
  'clike',
]);

// Night Owl, with comments lightened from #637777 (3.9:1 on the dark background, below the
// WCAG AA minimum of 4.5:1) to #7f9a9a (6.1:1). Everything else is the original theme.
const theme = {
  ...themes.nightOwl,
  styles: themes.nightOwl.styles.map((entry) =>
    entry.types.includes('comment')
      ? { ...entry, style: { ...entry.style, color: '#7f9a9a' } }
      : entry,
  ),
};

function resolveLanguage(language = 'text') {
  const normalized = LANGUAGE_ALIASES[language] ?? language;
  return SUPPORTED.has(normalized) ? normalized : 'plain';
}

export default function CodeBlock({ language = 'text', text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions / insecure page): the code can still be selected by hand
    }
  }

  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#011627] shadow-sm">
      <figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs tracking-wide text-zinc-400 uppercase">{language}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
          aria-label={copied ? 'Code copied' : 'Copy code'}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>

      <Highlight theme={theme} code={text} language={resolveLanguage(language)}>
        {({ tokens, getLineProps, getTokenProps }) => (
          // tabIndex: long lines scroll sideways, and keyboard users need focus to scroll them
          <pre
            tabIndex={0}
            className="overflow-x-auto p-4 font-mono text-sm leading-6 focus-visible:-outline-offset-2"
          >
            {tokens.map((line, lineIndex) => (
              <div key={lineIndex} {...getLineProps({ line })}>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </figure>
  );
}
