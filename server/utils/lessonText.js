/**
 * A generated lesson as compact plain text, for prompts that need the whole lesson as
 * context (the "ask a doubt" tutor). Unlike the narration outline, it keeps code and the
 * quiz, because learners ask about both ("why is B correct in question 2?").
 */
const DEFAULT_MAX_CHARS = 12_000; // ~3k tokens: the whole lesson for typical lessons, capped for huge ones

const letter = (index) => String.fromCharCode(65 + index); // 0 → A

function blockToText(block, questionNumber) {
  switch (block.type) {
    case 'heading':
      return `## ${block.text}`;
    case 'paragraph':
      return block.text;
    case 'callout':
      return `${block.variant === 'warning' ? 'Warning' : 'Tip'}: ${block.text}`;
    case 'list':
      return block.items
        .map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`))
        .join('\n');
    case 'code':
      return `\`\`\`${block.language ?? ''}\n${block.text}\n\`\`\``;
    case 'mcq':
      return [
        `Quiz question ${questionNumber}: ${block.question}`,
        ...block.options.map((option, index) => `${letter(index)}. ${option}`),
        `Correct answer: ${letter(block.answer)}. ${block.explanation ?? ''}`.trim(),
      ].join('\n');
    default:
      return null; // video: nothing useful to read
  }
}

export function lessonToText(lesson, { maxChars = DEFAULT_MAX_CHARS } = {}) {
  const parts = [];
  if (lesson.objectives?.length) {
    parts.push(`Objectives:\n${lesson.objectives.map((objective) => `- ${objective}`).join('\n')}`);
  }

  let questionNumber = 0;
  for (const block of lesson.content ?? []) {
    if (block.type === 'mcq') questionNumber += 1;
    const text = blockToText(block, questionNumber);
    if (text) parts.push(text);
  }

  const text = parts.join('\n\n');
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n[…the rest of the lesson was cut]` : text;
}
