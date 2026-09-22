import {
  ENQUIRY_TYPES,
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  type EnquiryType,
} from './types';

/**
 * Advisory client-side validation (FR-506, FR-507).
 *
 * Mirrors the server rules so the learner gets immediate, field-level feedback
 * instead of a round trip. It is **not** a trust boundary — the backend
 * independently re-validates every submission (SR-501), so this module only
 * ever decides what the form shows, never what is safe to store.
 */

/** The form's working values: all strings, because that is what inputs hold. */
export interface EnquiryDraft {
  name: string;
  email: string;
  phone: string;
  enquiryType: string;
  message: string;
}

export type EnquiryField = keyof EnquiryDraft;

export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

// Deliberately permissive, matching the server: something before the @, a
// domain with a dot, and no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s()./-]*$/;

function isEnquiryType(value: string): value is EnquiryType {
  return (ENQUIRY_TYPES as readonly string[]).includes(value);
}

/**
 * Validate a draft, returning one message per invalid field. Every field is
 * checked — the learner sees all problems at once rather than fixing them one
 * submission at a time.
 */
export function validateEnquiryDraft(draft: EnquiryDraft): EnquiryErrors {
  const errors: EnquiryErrors = {};

  const name = draft.name.trim();
  if (name.length === 0) {
    errors.name = 'Enter your name.';
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  const email = draft.email.trim();
  if (email.length === 0) {
    errors.email = 'Enter your email address.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address, for example name@example.com.';
  }

  // Phone is optional: a blank field is "not provided", not an error (FR-504).
  const phone = draft.phone.trim();
  if (phone.length > 0) {
    if (phone.length > PHONE_MAX_LENGTH) {
      errors.phone = `Phone number must be ${PHONE_MAX_LENGTH} characters or fewer.`;
    } else if (!PHONE_PATTERN.test(phone)) {
      errors.phone = 'Enter a valid phone number, or leave this field empty.';
    }
  }

  // The form's <select> always holds one of the enum values, so the empty case
  // is unreachable from the UI; it is kept because this function validates a
  // draft, not a particular control, and a caller may build one by hand.
  if (draft.enquiryType.trim().length === 0) {
    errors.enquiryType = 'Choose what your enquiry is about.';
  } else if (!isEnquiryType(draft.enquiryType)) {
    errors.enquiryType = 'Choose one of the listed enquiry types.';
  }

  const message = draft.message.trim();
  if (message.length === 0) {
    errors.message = 'Enter your enquiry.';
  } else if (message.length < MESSAGE_MIN_LENGTH) {
    errors.message = `Your enquiry must be at least ${MESSAGE_MIN_LENGTH} characters.`;
  } else if (message.length > MESSAGE_MAX_LENGTH) {
    errors.message = `Your enquiry must be ${MESSAGE_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}
