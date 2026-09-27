import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { Enquiry, EnquiryStatus, EnquiryType } from '../domain/enquiry.js';
import type { EnquiryRepository } from './enquiry-repository.js';

/**
 * SQLite-backed enquiry repository (Spec 16, FR-1601).
 *
 * Persists enquiries to a SQLite file so they survive restarts — the cheapest
 * durable option for the single-instance demo (no managed database). It holds
 * **no** business rules (reference generation, course verification and status all
 * belong to the Enquiry Service); it is pure data access behind the shared
 * `EnquiryRepository` interface, so the Service contract is unchanged.
 *
 * `better-sqlite3` is synchronous; the interface is async, so each method wraps
 * its result in a resolved Promise. Rows are stored with snake_case columns and
 * mapped to/from the camelCase `Enquiry` domain type here.
 */

/** One SQLite row, as stored (snake_case columns). */
interface EnquiryRow {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  course_id: string;
  course_title: string;
  enquiry_type: string;
  message: string;
  status: string;
  created_at: string;
}

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS enquiries (
    id            TEXT PRIMARY KEY,
    reference     TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT,
    course_id     TEXT NOT NULL,
    course_title  TEXT NOT NULL,
    enquiry_type  TEXT NOT NULL,
    message       TEXT NOT NULL,
    status        TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);
`;

function rowToEnquiry(row: EnquiryRow): Enquiry {
  return {
    id: row.id,
    reference: row.reference,
    name: row.name,
    email: row.email,
    // Optional field: absent when null. `exactOptionalPropertyTypes` means we
    // spread it in only when present rather than assigning `undefined`.
    ...(row.phone !== null ? { phone: row.phone } : {}),
    courseId: row.course_id,
    courseTitle: row.course_title,
    enquiryType: row.enquiry_type as EnquiryType,
    message: row.message,
    status: row.status as EnquiryStatus,
    createdAt: row.created_at,
  };
}

export class SqliteEnquiryRepository implements EnquiryRepository {
  private readonly db: Database.Database;

  /**
   * @param location SQLite file path, or `:memory:` for an ephemeral DB (tests).
   *   Parent directories are created for file paths so a fresh instance works
   *   with no manual setup (FR-1601.2).
   */
  constructor(location: string) {
    if (location !== ':memory:') {
      mkdirSync(dirname(location), { recursive: true });
    }
    this.db = new Database(location);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(CREATE_TABLE);
  }

  async create(enquiry: Enquiry): Promise<Enquiry> {
    // `better-sqlite3` is synchronous and throws on constraint violations (e.g. a
    // duplicate reference). Because the interface is Promise-based, run inside an
    // async method so a sync throw surfaces as a rejected promise, not an
    // uncaught synchronous exception at the call site.
    this.db
      .prepare(
        `INSERT INTO enquiries
           (id, reference, name, email, phone, course_id, course_title,
            enquiry_type, message, status, created_at)
         VALUES
           (@id, @reference, @name, @email, @phone, @courseId, @courseTitle,
            @enquiryType, @message, @status, @createdAt)`,
      )
      .run({
        id: enquiry.id,
        reference: enquiry.reference,
        name: enquiry.name,
        email: enquiry.email,
        phone: typeof enquiry.phone === 'string' ? enquiry.phone : null,
        courseId: enquiry.courseId,
        courseTitle: enquiry.courseTitle,
        enquiryType: enquiry.enquiryType,
        message: enquiry.message,
        status: enquiry.status,
        createdAt: enquiry.createdAt,
      });
    return { ...enquiry };
  }

  findByReference(reference: string): Promise<Enquiry | null> {
    const row = this.db
      .prepare('SELECT * FROM enquiries WHERE reference = ?')
      .get(reference) as EnquiryRow | undefined;
    return Promise.resolve(row ? rowToEnquiry(row) : null);
  }

  list(): Promise<readonly Enquiry[]> {
    const rows = this.db
      .prepare('SELECT * FROM enquiries ORDER BY created_at DESC, reference DESC')
      .all() as EnquiryRow[];
    return Promise.resolve(rows.map(rowToEnquiry));
  }
}
