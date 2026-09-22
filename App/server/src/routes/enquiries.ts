import { Router } from 'express';
import { validate } from '../http/validate.js';
import { asyncHandler } from '../http/async-handler.js';
import { enquiryController } from '../controllers/enquiry-controller.js';
import { enquiryInputSchema } from '../domain/enquiry.js';

/**
 * Enquiry routes (design §8, FR-511).
 *
 * The route contains no logic; it wires the authoritative validation boundary
 * to the controller. This is the project's first WRITE endpoint, so the schema
 * check in front of it is the trust boundary (SR-501) — the client's own
 * validation is advisory and is re-done here regardless.
 */
export const enquiriesRouter = Router();

// POST /api/enquiries — submit an enquiry.
enquiriesRouter.post(
  '/',
  validate('body', enquiryInputSchema),
  asyncHandler(enquiryController.create),
);
