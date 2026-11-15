import InlineText from './InlineText';

export default function ListBlock({ items, ordered }) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <List
      className={`my-4 space-y-2 pl-6 leading-7 text-ink/90 ${
        ordered ? 'list-decimal marker:font-semibold marker:text-brand' : 'list-disc marker:text-brand'
      }`}
    >
      {items.map((item, index) => (
        <li key={index} className="pl-1">
          <InlineText text={item} />
        </li>
      ))}
    </List>
  );
}
