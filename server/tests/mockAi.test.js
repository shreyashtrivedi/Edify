import { describe, expect, it } from 'vitest';
import { courseOutlineSchema } from '../schemas/course.schemas.js';
import { lessonContentSchema } from '../schemas/lesson.schemas.js';
import { mockCourseOutline, mockLessonContent } from '../services/mocks/mockAi.js';

// If someone changes a schema, these fail until the mock data is updated too.
describe('mock AI data stays in sync with the real AI schemas', () => {
  it('mock course outline is valid', () => {
    expect(courseOutlineSchema.safeParse(mockCourseOutline('intro to sql')).success).toBe(true);
  });

  it('mock lesson content is valid', () => {
    expect(lessonContentSchema.safeParse(mockLessonContent('Joins')).success).toBe(true);
  });
});
