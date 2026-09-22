import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { EnquiryInput } from '../domain/enquiry.js';
import {
  CourseUnavailableError,
  enquiryService,
  type EnquiryService,
} from '../services/enquiry-service.js';

/**
 * Enquiry Controller — HTTP concerns only (design §8).
 *
 * The body has already been Zod-validated by the `validate` middleware, so this
 * handler receives typed, sanitised input. Its whole job is to call the Service
 * and translate the Service's typed failures into the shared error envelope; no
 * validation, reference generation or persistence logic lives here (NFR-501).
 */
export class EnquiryController {
  constructor(private readonly service: EnquiryService = enquiryService) {}

  /** POST /api/enquiries — create an enquiry (FR-511, FR-512). */
  create = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as EnquiryInput;

    try {
      const result = await this.service.submit(input);
      res.status(201).json({ data: result });
    } catch (error) {
      // An enquiry for a course that does not exist or is not publicly listable
      // is the same condition `GET /api/courses/:courseId` reports as 404, so it
      // is mapped the same way for one consistent rule across the API (FR-510,
      // FR-517). The Service's message is already caller-safe (SR-503).
      if (error instanceof CourseUnavailableError) {
        throw ApiError.notFound(error.message);
      }
      // Anything else is unexpected: the centralised handler logs it server-side
      // and returns a sanitised 500.
      throw error;
    }
  };
}

export const enquiryController = new EnquiryController();
