/**
 * Human approval for writes (Spec 12 §6, FR-1204; Spec 10).
 *
 * The MCP server MUST obtain explicit human approval before a WRITE and MUST
 * **fail closed**: if approval cannot be obtained (no approver wired, or the human
 * declines), the write is refused. The server NEVER self-approves.
 *
 * How approval is surfaced depends on the MCP client. The server bootstrap wires
 * a concrete approver (e.g. an MCP elicitation prompt). The default here is the
 * safe one: deny.
 */

/** Non-PII context describing what needs approval. No enquiry values. */
export interface ApprovalContext {
  readonly capability: string;
  readonly courseId: string;
  readonly enquiryType: string;
}

export interface HumanApproval {
  /** Resolve true only on an explicit human approval; false otherwise. */
  request(context: ApprovalContext): Promise<boolean>;
}

/**
 * Fail-closed default: denies every write. Used when no human-approval channel is
 * available, so an unattended server can never submit on a human's behalf.
 */
export class DenyingApproval implements HumanApproval {
  request(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

/** Adapter around an async approver function (wired by the bootstrap/tests). */
export class FunctionApproval implements HumanApproval {
  constructor(private readonly fn: (context: ApprovalContext) => Promise<boolean>) {}
  request(context: ApprovalContext): Promise<boolean> {
    return this.fn(context);
  }
}
