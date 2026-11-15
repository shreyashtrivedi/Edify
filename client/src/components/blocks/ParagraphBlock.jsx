import InlineText from './InlineText';

export default function ParagraphBlock({ text }) {
  return (
    <p className="my-4 leading-7 whitespace-pre-line text-ink/90">
      <InlineText text={text} />
    </p>
  );
}
