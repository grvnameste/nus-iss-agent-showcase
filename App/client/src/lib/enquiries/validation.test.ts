import { describe, expect, it } from 'vitest';
import { MESSAGE_MAX_LENGTH, MESSAGE_MIN_LENGTH } from './types';
import { validateEnquiryDraft, type EnquiryDraft } from './validation';

/**
 * Client-side (advisory) validation tests (Spec 05, FR-506, FR-507).
 *
 * These mirror the server's rules for immediate feedback only. The backend
 * re-validates everything regardless, so a gap here is a UX bug, never a
 * security one.
 */

function draft(overrides: Partial<EnquiryDraft> = {}): EnquiryDraft {
  return {
    name: 'Alex Tan',
    email: 'alex.tan@example.com',
    phone: '',
    enquiryType: 'general',
    message: 'How much prior experience do I need for this course?',
    ...overrides,
  };
}

describe('validateEnquiryDraft', () => {
  it('reports no errors for a complete draft', () => {
    expect(validateEnquiryDraft(draft())).toEqual({});
  });

  it('treats an omitted phone as valid (FR-504)', () => {
    expect(validateEnquiryDraft(draft({ phone: '   ' })).phone).toBeUndefined();
  });

  it('accepts a supplied international phone number', () => {
    expect(validateEnquiryDraft(draft({ phone: '+65 9123 4567' })).phone).toBeUndefined();
  });

  it.each(['name', 'email', 'message'] as const)('requires %s', (field) => {
    const errors = validateEnquiryDraft(draft({ [field]: '   ' }));
    expect(errors[field]).toBeTruthy();
  });

  it('requires an enquiry type', () => {
    expect(validateEnquiryDraft(draft({ enquiryType: '' })).enquiryType).toBeTruthy();
  });

  it('rejects an enquiry type outside the allowed set', () => {
    expect(validateEnquiryDraft(draft({ enquiryType: 'refunds' })).enquiryType).toBeTruthy();
  });

  it.each(['not-an-email', 'alex@', '@example.com'])('rejects the email %s', (email) => {
    expect(validateEnquiryDraft(draft({ email })).email).toBeTruthy();
  });

  it('rejects a phone containing letters', () => {
    expect(validateEnquiryDraft(draft({ phone: 'call me' })).phone).toBeTruthy();
  });

  it('rejects a message below the minimum length', () => {
    const errors = validateEnquiryDraft(draft({ message: 'a'.repeat(MESSAGE_MIN_LENGTH - 1) }));
    expect(errors.message).toContain(String(MESSAGE_MIN_LENGTH));
  });

  it('rejects a message above the maximum length', () => {
    const errors = validateEnquiryDraft(draft({ message: 'a'.repeat(MESSAGE_MAX_LENGTH + 1) }));
    expect(errors.message).toContain(String(MESSAGE_MAX_LENGTH));
  });

  it('reports every invalid field at once rather than stopping at the first', () => {
    const errors = validateEnquiryDraft(draft({ name: '', email: 'bad', message: '' }));
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name']);
  });
});
