import { describe, expect, it } from 'vitest';
import { flattenLessons, lessonPath, sharedLessonPath, sharePath } from './paths';

const course = {
  modules: [
    { title: 'M1', lessons: [{ _id: 'a' }, { _id: 'b' }] },
    { title: 'M2', lessons: [{ _id: 'c' }] },
  ],
};

describe('URL builders', () => {
  it('use 1-based module and lesson numbers', () => {
    expect(lessonPath('c1', 0, 0)).toBe('/courses/c1/module/1/lesson/1');
    expect(sharePath('tok')).toBe('/share/tok');
    expect(sharedLessonPath('tok', 1, 2)).toBe('/share/tok/module/2/lesson/3');
  });
});

describe('flattenLessons', () => {
  it('lists every lesson in course order, across modules', () => {
    expect(
      flattenLessons(course).map(({ lesson, moduleIndex, lessonIndex }) => [
        lesson._id,
        moduleIndex,
        lessonIndex,
      ]),
    ).toEqual([
      ['a', 0, 0],
      ['b', 0, 1],
      ['c', 1, 0],
    ]);
  });
});
