import { describe, expect, it } from 'vitest';
import {
  InMemoryCourseRepository,
  courseRepository,
} from './course-repository.js';
import { COURSES } from '../data/course-data.js';

describe('InMemoryCourseRepository', () => {
  it('loads the validated fixture and returns all records via findAll', async () => {
    const repo = new InMemoryCourseRepository();
    const all = await repo.findAll();
    expect(all.length).toBe(COURSES.length);
    expect(all.length).toBeGreaterThan(20);
  });

  it('findById returns the matching course (hit)', async () => {
    const repo = new InMemoryCourseRepository();
    const course = await repo.findById('cyber-essentials-pt');
    expect(course).not.toBeNull();
    expect(course?.id).toBe('cyber-essentials-pt');
  });

  it('findById returns null for an unknown id (miss)', async () => {
    const repo = new InMemoryCourseRepository();
    expect(await repo.findById('does-not-exist')).toBeNull();
  });

  it('can be constructed over an injected dataset (substitutable source)', async () => {
    const fake = [
      { ...COURSES[0]!, id: 'only-one' },
    ];
    const repo = new InMemoryCourseRepository(fake);
    expect((await repo.findAll()).length).toBe(1);
    expect(await repo.findById('only-one')).not.toBeNull();
  });

  it('exposes a shared default instance backed by the fixture', async () => {
    expect((await courseRepository.findAll()).length).toBe(COURSES.length);
  });
});
