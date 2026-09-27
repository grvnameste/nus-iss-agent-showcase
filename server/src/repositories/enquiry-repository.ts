import type { Enquiry } from '../domain/enquiry.js';
import { env } from '../config/env.js';
import { SqliteEnquiryRepository } from './sqlite-enquiry-repository.js';

/**
 * Enquiry data-access contract (design §6, FR-513, NFR-508).
 *
 * The repository is the only component that knows where enquiries are kept. It
 * holds **no** business rules — reference generation, course verification and
 * status all belong to the Enquiry Service. Because it is an interface, tests
 * inject their own instance and a future database implementation can replace
 * the synthetic store without touching the Service contract.
 */
export interface EnquiryRepository {
  /** Persist an enquiry and return the stored record. */
  create(enquiry: Enquiry): Promise<Enquiry>;
  /** Return the enquiry with the given reference, or null if none matches. */
  findByReference(reference: string): Promise<Enquiry | null>;
  /** Return all stored enquiries, newest first (Spec 16, FR-1602). */
  list(): Promise<readonly Enquiry[]>;
}

/**
 * Synthetic in-memory store (FR-513): a plain array, no database and no file
 * I/O. Each instance owns its own array so tests never share mutable state.
 *
 * Records are copied in and out so a caller holding a returned object cannot
 * mutate what is stored — the same defensive posture the frozen course dataset
 * gets for free.
 */
export class InMemoryEnquiryRepository implements EnquiryRepository {
  private readonly enquiries: Enquiry[] = [];

  create(enquiry: Enquiry): Promise<Enquiry> {
    this.enquiries.push({ ...enquiry });
    return Promise.resolve({ ...enquiry });
  }

  findByReference(reference: string): Promise<Enquiry | null> {
    const match = this.enquiries.find((enquiry) => enquiry.reference === reference);
    return Promise.resolve(match ? { ...match } : null);
  }

  /** All stored enquiries, newest first (insertion order reversed). */
  list(): Promise<readonly Enquiry[]> {
    return Promise.resolve([...this.enquiries].reverse().map((e) => ({ ...e })));
  }
}

/**
 * Build the default repository from validated configuration (Spec 16).
 *
 * `sqlite` persists to `ENQUIRY_DB_PATH` (durable across restarts — the default
 * for the running app and the Lightsail demo); `memory` keeps the original
 * in-process store (tests inject their own instance regardless).
 */
function createEnquiryRepository(): EnquiryRepository {
  // Under test, default to the in-memory store so suites are deterministic and
  // never touch disk. `ENQUIRY_STORE` has a default of 'sqlite', so a test that
  // genuinely wants the file path must set NODE_ENV!=='test'.
  if (env.NODE_ENV === 'test' || env.ENQUIRY_STORE === 'memory') {
    return new InMemoryEnquiryRepository();
  }
  return new SqliteEnquiryRepository(env.ENQUIRY_DB_PATH);
}

/** Shared default repository instance for the running application. */
export const enquiryRepository: EnquiryRepository = createEnquiryRepository();
