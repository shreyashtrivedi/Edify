import { Sparkles } from 'lucide-react';
import { parseTutorText } from '../../utils/tutorFormat';
import CodeBlock from '../blocks/CodeBlock';
import InlineText from '../blocks/InlineText';

/** Three bouncing dots: the tutor is thinking (shown until the first words arrive). */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-2" aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 rounded-full bg-muted motion-safe:animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** A tutor answer as paragraphs, lists and highlighted code (no raw HTML, see tutorFormat.js). */
function AnswerText({ text }) {
  return parseTutorText(text).map((block, index) => {
    if (block.type === 'code') {
      return <CodeBlock key={index} language={block.language} text={block.text} />;
    }
    if (block.type === 'list') {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List
          key={index}
          className={`space-y-1 pl-5 marker:text-muted ${block.ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <InlineText text={item} />
            </li>
          ))}
        </List>
      );
    }
    return (
      <p key={index}>
        <InlineText text={block.text} />
      </p>
    );
  });
}

/** One chat message: the learner's question (right) or the tutor's answer (left). */
export default function TutorMessage({ message }) {
  if (message.role === 'user') {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-on-brand">
          <span className="sr-only">You: </span>
          {message.text}
        </p>
      </li>
    );
  }

  const thinking = message.streaming && !message.text;
  return (
    <li className="flex gap-2.5">
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
        aria-hidden="true"
      >
        <Sparkles className="size-4" />
      </span>
      {/* gap (not space-y) so the code block's own margins can be removed without losing spacing;
          code gets a smaller font in the narrow chat */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm leading-6 wrap-break-word [&_figure]:my-0 [&_pre]:text-xs">
        <span className="sr-only">Tutor: </span>
        {thinking ? <TypingDots /> : <AnswerText text={message.text} />}
        {message.streaming && !thinking && <TypingDots />}
      </div>
    </li>
  );
}
