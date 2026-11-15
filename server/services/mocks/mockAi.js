/**
 * Sample AI responses used when AI_MOCK=true (development only).
 * They match the real AI schemas exactly, so the whole app can be built and
 * demoed without an API key, without spending quota, and without waiting.
 */

const titleCase = (text) => text.replace(/\b\w/g, (char) => char.toUpperCase());

export function mockCourseOutline(topic) {
  const subject = titleCase(topic.slice(0, 60));
  return {
    title: `${subject}: A Practical Introduction`,
    description: `A hands-on course that takes you from the core ideas of ${topic} to applying them in real projects. You will understand the key concepts, avoid common mistakes and build confidence through practice.`,
    tags: ['sample', 'beginner friendly', 'hands-on'],
    modules: [
      {
        title: 'Getting Started',
        description: `What ${topic} is, why it matters and the vocabulary you need.`,
        lessons: [`What Is ${subject}?`, 'Core Terminology', 'Setting Up Your Environment'],
      },
      {
        title: 'Core Concepts',
        description: 'The fundamental building blocks, explained with examples.',
        lessons: ['The Building Blocks', 'How the Pieces Fit Together', 'Common Patterns', 'Typical Mistakes and How to Avoid Them'],
      },
      {
        title: 'Going Deeper',
        description: 'Techniques that separate beginners from confident practitioners.',
        lessons: ['Advanced Techniques', 'Performance and Best Practices', 'Debugging and Troubleshooting'],
      },
      {
        title: 'Real-World Application',
        description: 'Put everything together in a realistic mini project.',
        lessons: ['Planning a Project', 'Building It Step by Step', 'Reviewing and Improving Your Work'],
      },
    ],
  };
}

export function mockLessonContent(lessonTitle) {
  return {
    objectives: [
      `Explain the main idea behind "${lessonTitle}"`,
      'Identify when and why to apply it in practice',
      'Apply the concept in a small working example',
    ],
    keyTopics: ['Core idea', 'Practical usage', 'Common pitfalls'],
    content: [
      {
        type: 'paragraph',
        text: `This is **sample content** generated in mock mode for "${lessonTitle}". It shows every block type the lesson renderer supports, so the interface can be developed without calling the AI.`,
      },
      { type: 'video', query: `${lessonTitle} explained for beginners` },
      { type: 'heading', text: 'The Core Idea' },
      {
        type: 'paragraph',
        text: 'Every concept is easier to learn when you understand **why** it exists. Start with the problem it solves, then look at how it solves it. Inline code such as `const total = 42` is highlighted too.',
      },
      {
        type: 'list',
        ordered: true,
        items: ['Understand the problem', 'Learn the core concept', 'Practise with an example', 'Review common mistakes'],
      },
      { type: 'heading', text: 'A Worked Example' },
      {
        type: 'code',
        language: 'javascript',
        text: "// Calculate the average of a list of scores\nfunction average(scores) {\n  if (scores.length === 0) return 0;\n  const total = scores.reduce((sum, score) => sum + score, 0);\n  return total / scores.length;\n}\n\nconsole.log(average([80, 92, 75])); // 82.33",
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Type the example out yourself instead of copying it. Active practice builds memory far faster than reading.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'A common mistake is forgetting edge cases, such as an empty list in the example above.',
      },
      { type: 'heading', text: 'Summary' },
      {
        type: 'paragraph',
        text: 'You learned the core idea, saw it applied in a worked example and reviewed a common pitfall. Test yourself with the questions below.',
      },
      {
        type: 'mcq',
        question: 'What is the best first step when learning a new concept?',
        options: ['Memorise the syntax', 'Understand the problem it solves', 'Skip to advanced topics', 'Copy code from the internet'],
        answer: 1,
        explanation: 'Knowing which problem a concept solves gives you a mental hook for everything else.',
      },
      {
        type: 'mcq',
        question: 'What does average([]) return in the example?',
        options: ['undefined', 'NaN', '0', 'It throws an error'],
        answer: 2,
        explanation: 'The function checks for an empty list first and returns 0, avoiding a division by zero.',
      },
      {
        type: 'mcq',
        question: 'Why is typing examples out better than copying them?',
        options: ['It is faster', 'Active practice improves retention', 'Copying is not allowed', 'There is no difference'],
        answer: 1,
        explanation: 'Actively producing the code forces you to process each part, which strengthens memory.',
      },
      {
        type: 'mcq',
        question: 'Which of these is an edge case for a function that averages numbers?',
        options: ['A list of three numbers', 'A list of positive numbers', 'An empty list', 'A sorted list'],
        answer: 2,
        explanation: 'An empty list is the boundary case that breaks a naive implementation.',
      },
    ],
    resources: [
      {
        title: 'MDN Web Docs: JavaScript Guide',
        type: 'documentation',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
        searchQuery: 'MDN JavaScript guide',
      },
      { title: `Beginner's guide to ${lessonTitle}`, type: 'article', searchQuery: `${lessonTitle} beginner guide` },
    ],
  };
}
