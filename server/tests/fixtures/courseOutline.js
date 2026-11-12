/** A realistic AI response for the course-outline prompt (3 modules × 3 lessons). */
export const courseOutline = {
  title: 'React Hooks from Zero to Confident',
  description:
    'Learn how React Hooks manage state, side effects and shared logic. By the end you will build clean, reusable function components.',
  tags: ['React', 'hooks', 'javascript', 'react'],
  modules: [
    {
      title: 'Foundations of Hooks',
      description: 'Why hooks exist and the rules that make them work.',
      lessons: ['Why React Introduced Hooks', 'The Rules of Hooks', 'Managing State with useState'],
    },
    {
      title: 'Side Effects and Context',
      description: 'Synchronise components with the outside world and share data.',
      lessons: [
        'Managing Side Effects with useEffect',
        'Cleaning Up Effects',
        'Sharing Data with useContext',
      ],
    },
    {
      title: 'Building Real Apps with Hooks',
      description: 'Combine hooks into reusable patterns for real projects.',
      lessons: [
        'Writing Custom Hooks',
        'Performance with useMemo and useCallback',
        'Project: A Data-Fetching Dashboard',
      ],
    },
  ],
};
