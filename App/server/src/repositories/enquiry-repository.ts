import type { Enquiry } from '../domain/enquiry.js';

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
}

/** Shared default repository instance for the running application. */
export const enquiryRepository: EnquiryRepository = new InMemoryEnquiryRepository();
