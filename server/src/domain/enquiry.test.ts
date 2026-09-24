import { describe, expect, it } from 'vitest';
import {
  ENQUIRY_TYPES,
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  enquiryInputSchema,
} from './enquiry.js';

/**
 * Enquiry domain/schema tests (Spec 05, TASK-517).
 *
 * The schema is the authoritative trust boundary (SR-501): every rule the API
 * promises in FR-509 is asserted here, independently of HTTP.
 */

function validInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Alex Tan',
    email: 'alex.tan@example.com',
    courseId: 'ai-foundations',
    enquiryType: 'general',
    message: 'Could you tell me more about the weekly time commitment?',
    ...overrides,
  };
}

describe('ENQUIRY_TYPES', () => {
  it('defines the constrained enquiry categories once (FR-505)', () => {
    expect([...ENQUIRY_TYPES]).toEqual([
      'general',
      'course_content',
      'fees_funding',
      'admissions',
      'other',
    ]);
  });
});

describe('enquiryInputSchema', () => {
  it('accepts a valid enquiry without the optional phone', () => {
    const result = enquiryInputSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it('accepts a valid international phone number', () => {
    const result = enquiryInputSchema.safeParse(validInput({ phone: '+65 9123 4567' }));
    expect(result.success).toBe(true);
  });

  it('trims surrounding whitespace on free-text fields', () => {
    const result = enquiryInputSchema.parse(
      validInput({ name: '  Alex Tan  ', message: `  ${'a'.repeat(30)}  ` }),
    );
    expect(result.name).toBe('Alex Tan');
    expect(result.message).toBe('a'.repeat(30));
  });

  it('normalises email to lower case', () => {
    const result = enquiryInputSchema.parse(validInput({ email: 'Alex.Tan@Example.COM' }));
    expect(result.email).toBe('alex.tan@example.com');
  });

  it('omits phone entirely when it is blank', () => {
    const result = enquiryInputSchema.parse(validInput({ phone: '   ' }));
    expect(result.phone).toBeUndefined();
  });

  it.each([
    ['name', ''],
    ['email', ''],
    ['courseId', ''],
    ['message', ''],
  ])('rejects an empty %s (FR-509)', (field, value) => {
    const result = enquiryInputSchema.safeParse(validInput({ [field]: value }));
    expect(result.success).toBe(false);
  });

  it.each(['not-an-email', 'alex@', '@example.com', 'alex example.com'])(
    'rejects the malformed email %s',
    (email) => {
      expect(enquiryInputSchema.safeParse(validInput({ email })).success).toBe(false);
    },
  );

  it('rejects an enquiry type outside the allowed set', () => {
    const result = enquiryInputSchema.safeParse(validInput({ enquiryType: 'refunds' }));
    expect(result.success).toBe(false);
  });

  it('rejects a phone containing letters', () => {
    const result = enquiryInputSchema.safeParse(validInput({ phone: 'call-me' }));
    expect(result.success).toBe(false);
  });

  it(`rejects a message shorter than ${MESSAGE_MIN_LENGTH} characters`, () => {
    const result = enquiryInputSchema.safeParse({
      ...validInput(),
      message: 'a'.repeat(MESSAGE_MIN_LENGTH - 1),
    });
    expect(result.success).toBe(false);
  });

  it(`rejects a message longer than ${MESSAGE_MAX_LENGTH} characters`, () => {
    const result = enquiryInputSchema.safeParse({
      ...validInput(),
      message: 'a'.repeat(MESSAGE_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('bounds every string field with a maximum length (SR-505)', () => {
    const oversized = validInput({
      name: 'a'.repeat(101),
      email: `${'a'.repeat(250)}@example.com`,
      phone: '+'.concat('1'.repeat(40)),
      courseId: 'a'.repeat(201),
    });
    const result = enquiryInputSchema.safeParse(oversized);
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = result.error.issues.map((issue) => issue.path.join('.'));
    expect(new Set(fields)).toEqual(new Set(['name', 'email', 'phone', 'courseId']));
  });

  it('strips unknown fields so they can never reach storage', () => {
    const result = enquiryInputSchema.parse(validInput({ isAdmin: true }));
    expect(result).not.toHaveProperty('isAdmin');
  });
});
