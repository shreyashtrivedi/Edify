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

/**
 * @param {object[]} props.content          lesson blocks
 * @param {(number|null)[]} props.initialAnswers  saved quiz answers (one per question)
 * @param {(answers) => void} props.onAnswersChange  called after every answer, to save it
 */
export default function LessonRenderer({ content, initialAnswers = [], onAnswersChange }) {
  const questions = content.filter((block) => block.type === 'mcq');
  // One entry per question: the chosen option index, or null if unanswered.
  const [answers, setAnswers] = useState(() => questions.map((_, i) => initialAnswers[i] ?? null));

  const answeredCount = answers.filter((answer) => answer !== null).length;
  const correctCount = answers.filter(
    (answer, i) => answer !== null && answer === questions[i].answer,
  ).length;

  function selectAnswer(questionIndex, option) {
    const next = answers.map((answer, i) => (i === questionIndex ? option : answer));
    setAnswers(next);
    onAnswersChange?.(next);
  }

  // Block positions of the questions, so each mcq block knows its question number.
  const questionBlockIndexes = content.flatMap((block, index) => (block.type === 'mcq' ? [index] : []));

  return (
    <div>
      {content.map((block, index) => {
        const Block = BLOCK_COMPONENTS[block.type];
        if (!Block) return null;
        if (block.type !== 'mcq') return <Block key={index} {...block} />;

        const current = questionBlockIndexes.indexOf(index);
        return (
          <div key={index}>
            {current === 0 && (
              <div className="mt-12 mb-2 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-8">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  Check your understanding
                </h2>
                {answeredCount > 0 && (
                  <p className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
                    Score: {correctCount}/{questions.length}
                    {answeredCount === questions.length && correctCount === questions.length
                      ? ' 🎉'
                      : ''}
                  </p>
                )}
              </div>
            )}
            <MCQBlock
              {...block}
              number={current + 1}
              total={questions.length}
              selected={answers[current]}
              onSelect={(option) => selectAnswer(current, option)}
            />
          </div>
        );
      })}
    </div>
  );
}
