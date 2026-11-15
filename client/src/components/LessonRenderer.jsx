import { useState } from 'react';
import CalloutBlock from './blocks/CalloutBlock';
import CodeBlock from './blocks/CodeBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ListBlock from './blocks/ListBlock';
import MCQBlock from './blocks/MCQBlock';
import ParagraphBlock from './blocks/ParagraphBlock';
import VideoBlock from './blocks/VideoBlock';

/**
 * Turns a lesson's content array into UI: each block's `type` picks a component.
 * Adding a new block type = one new component + one line in this map.
 * Unknown types are skipped, so older clients never crash on newer content.
 */
const BLOCK_COMPONENTS = {
  heading: HeadingBlock,
  paragraph: ParagraphBlock,
  list: ListBlock,
  code: CodeBlock,
  callout: CalloutBlock,
  video: VideoBlock,
  mcq: MCQBlock,
};

export default function LessonRenderer({ content }) {
  // Quiz results by block index: { 12: true, 13: false }
  const [results, setResults] = useState({});

  const mcqIndexes = content.flatMap((block, index) => (block.type === 'mcq' ? [index] : []));
  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter(Boolean).length;

  return (
    <div>
      {content.map((block, index) => {
        const Block = BLOCK_COMPONENTS[block.type];
        if (!Block) return null;

        if (block.type !== 'mcq') return <Block key={index} {...block} />;

        const number = mcqIndexes.indexOf(index) + 1;
        return (
          <div key={index}>
            {number === 1 && (
              <div className="mt-12 mb-2 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-8">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  Check your understanding
                </h2>
                {answeredCount > 0 && (
                  <p className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
                    Score: {correctCount}/{mcqIndexes.length}
                    {answeredCount === mcqIndexes.length && (correctCount === mcqIndexes.length ? ' 🎉' : '')}
                  </p>
                )}
              </div>
            )}
            <MCQBlock
              {...block}
              number={number}
              total={mcqIndexes.length}
              onAnswer={(correct) => setResults((current) => ({ ...current, [index]: correct }))}
            />
          </div>
        );
      })}
    </div>
  );
}
