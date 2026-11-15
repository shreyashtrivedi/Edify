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
  'javascript', 'typescript', 'jsx', 'tsx', 'python', 'markup', 'css', 'json', 'yaml', 'sql',
  'graphql', 'markdown', 'go', 'rust', 'cpp', 'c', 'swift', 'kotlin', 'objectivec', 'clike',
]);

function resolveLanguage(language = 'text') {
  const normalized = LANGUAGE_ALIASES[language] ?? language;
  return SUPPORTED.has(normalized) ? normalized : 'plain';
}

export default function CodeBlock({ language = 'text', text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#011627] shadow-sm">
      <figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs tracking-wide text-zinc-400 uppercase">{language}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>

      <Highlight theme={themes.nightOwl} code={text} language={resolveLanguage(language)}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-6">
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
