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

  /**
   * GET /api/enquiries — list stored enquiries, newest first (Spec 16, FR-1602).
   * A READ; returns the shared `{ data }` envelope. Demo affordance: full records
   * (synthetic data, no masking, no auth).
   */
  list = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.list();
    res.status(200).json({ data });
  };

  /** GET /api/enquiries/:reference — one stored enquiry or a sanitised 404. */
  getByReference = async (req: Request, res: Response): Promise<void> => {
    const { reference } = req.params as { reference: string };
    const enquiry = await this.service.getByReference(reference);
    if (enquiry === null) {
      throw ApiError.notFound(`No enquiry found with reference "${reference}"`);
    }
    res.status(200).json({ data: enquiry });
  };
}

export const enquiryController = new EnquiryController();
