import type { Enquiry, EnquiryInput, EnquiryStatus } from '../domain/enquiry.js';
import {
  enquiryRepository,
  type EnquiryRepository,
} from '../repositories/enquiry-repository.js';
import { courseService, type CourseService } from './course-service.js';

/**
 * Enquiry Service — the single home of enquiry business logic (design §7,
 * NFR-501). It is transport-agnostic: no Express, no React, no HTTP types leak
 * in, so the whole capability is unit-testable without a server (NFR-507).
 *
 * Pipeline inside `submit`: verify course → build record → persist → return.
 */

/** Result returned to the controller and, in turn, to the client (FR-512). */
export interface CreateEnquiryResult {
  reference: string;
  courseId: string;
  courseTitle: string;
  status: EnquiryStatus;
  createdAt: string;
}

export interface EnquiryService {
  submit(input: EnquiryInput): Promise<CreateEnquiryResult>;
}

/**
 * Typed, operational failure for an enquiry whose course does not exist or is
 * not publicly listable (FR-510). The Service stays transport-agnostic, so it
 * throws this rather than an HTTP error; the controller maps it (design §8).
 */
export class CourseUnavailableError extends Error {
  constructor(public readonly courseId: string) {
    super('The selected course is not available for enquiries.');
    this.name = 'CourseUnavailableError';
  }
}

/** Injected time source, so references and timestamps are deterministic. */
export interface EnquiryClock {
  now(): Date;
}

/** One enquiry's generated identity: an internal id plus its public reference. */
export interface EnquiryIdentity {
  id: string;
  reference: string;
}

/**
 * Injected id/reference source (FR-514, NFR-506). Both values are issued in one
 * call so an implementation cannot pair a record with a mismatched reference.
 */
export interface EnquiryIdGenerator {
  /** Issue the next identity; `year` prefixes the human-facing reference. */
  next(year: number): EnquiryIdentity;
}

const REFERENCE_PREFIX = 'ENQ';
const REFERENCE_SEQUENCE_WIDTH = 6;

/**
 * Default synthetic generator: a monotonic in-process counter. Deterministic
 * from a known starting point, which is exactly what the tests need and all a
 * synthetic demonstration requires (no distributed uniqueness guarantees).
 */
export class SequentialEnquiryIdGenerator implements EnquiryIdGenerator {
  private sequence = 0;

  next(year: number): EnquiryIdentity {
    this.sequence += 1;
    const padded = String(this.sequence).padStart(REFERENCE_SEQUENCE_WIDTH, '0');
    return {
      id: `enq-${this.sequence}`,
      reference: `${REFERENCE_PREFIX}-${year}-${padded}`,
    };
  }
}

const systemClock: EnquiryClock = { now: () => new Date() };

export interface EnquiryServiceDependencies {
  repository?: EnquiryRepository;
  courseService?: CourseService;
  idGenerator?: EnquiryIdGenerator;
  clock?: EnquiryClock;
}

export class DefaultEnquiryService implements EnquiryService {
  private readonly repository: EnquiryRepository;
  private readonly courses: CourseService;
  private readonly ids: EnquiryIdGenerator;
  private readonly clock: EnquiryClock;

  constructor(dependencies: EnquiryServiceDependencies = {}) {
    this.repository = dependencies.repository ?? enquiryRepository;
    this.courses = dependencies.courseService ?? courseService;
    this.ids = dependencies.idGenerator ?? new SequentialEnquiryIdGenerator();
    this.clock = dependencies.clock ?? systemClock;
  }

  async submit(input: EnquiryInput): Promise<CreateEnquiryResult> {
    // 1. Verify the course through the existing Course capability. `getById`
    //    already applies the listability rule, so an unlisted course reads back
    //    as null and no course logic is duplicated here (FR-510, AD-504).
    const course = await this.courses.getById(input.courseId);
    if (course === null) {
      throw new CourseUnavailableError(input.courseId);
    }

    // 2. Build the record from injected sources so it is reproducible.
    const now = this.clock.now();
    const { id, reference } = this.ids.next(now.getUTCFullYear());
    const enquiry: Enquiry = {
      ...input,
      id,
      reference,
      status: 'received',
      // Captured at submission so the confirmation survives later catalogue edits.
      courseTitle: course.title,
      createdAt: now.toISOString(),
    };

    // 3. Persist, then 4. return only what the confirmation needs — personal
    //    fields stay in storage and never travel back to the client (FR-519).
    const stored = await this.repository.create(enquiry);

    return {
      reference: stored.reference,
      courseId: stored.courseId,
      courseTitle: stored.courseTitle,
      status: stored.status,
      createdAt: stored.createdAt,
    };
  }
}

/** Shared default service instance over the default repository. */
export const enquiryService: EnquiryService = new DefaultEnquiryService();
