/**
 * MCP tool input schemas (Spec 12 §4, FR-1203).
 *
 * Reuses the server's authoritative enquiry schema for the enquiry candidate, so
 * there is no third mirrored copy (Spec 09 D4). Course-query and compare shapes
 * are defined here as they mirror the controller's query contract; the backend
 * service remains authoritative for behaviour.
 */
import { z } from 'zod';
import { enquiryInputSchema } from '../../../server/src/domain/enquiry.js';

const KEYWORD_MAX = 200;
const PAGE_SIZE_MAX = 48;
const COURSE_ID_MAX = 200;
const MAX_COMPARE = 4;

export const findCoursesInput = z.object({
  keyword: z.string().max(KEYWORD_MAX).optional(),
  discipline: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  courseType: z.array(z.string()).optional(),
  level: z.array(z.string()).optional(),
  deliveryMode: z.array(z.string()).optional(),
  availability: z.array(z.string()).optional(),
  sort: z.enum(['relevance', 'title', 'duration', 'fee', 'startDate']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(PAGE_SIZE_MAX).optional(),
});
export type FindCoursesInput = z.infer<typeof findCoursesInput>;

export const getCourseDetailsInput = z.object({
  courseId: z.string().min(1).max(COURSE_ID_MAX),
});

export const compareCoursesInput = z.object({
  courseIds: z
    .array(z.string().min(1).max(COURSE_ID_MAX))
    .min(2)
    .max(MAX_COMPARE)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'courseIds must be unique',
    }),
});
export type CompareCoursesInput = z.infer<typeof compareCoursesInput>;

/** The authoritative enquiry candidate — reused from the server (no copy). */
export const enquiryCandidate = enquiryInputSchema;
export type EnquiryCandidate = z.infer<typeof enquiryCandidate>;
