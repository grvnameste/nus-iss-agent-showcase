/**
 * MCP tool registration (Spec 12 §5, FR-1201).
 *
 * Advertises the seven MCP-applicable capabilities as MCP tools and routes each to
 * the capability adapter (which reuses the backend services and is the
 * AUTHORITATIVE validator). `navigate_to_course` is intentionally NOT registered —
 * it is browser-only (Spec 09 D2).
 *
 * Design note (types): the MCP SDK requires a Zod raw shape for `inputSchema`, and
 * it bundles its own copy of Zod. Passing our root-project Zod schemas at the
 * TYPE level makes `tsc` try to unify two Zod instances, which triggers
 * heap-exhausting type instantiation. At RUNTIME the two Zod 3 instances are
 * structurally compatible, so we pass real `z.*` raw shapes but register through a
 * narrow `unknown`-typed facade — decoupling the types while satisfying the SDK.
 * The adapter re-validates every input authoritatively regardless.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import type { CapabilityAdapter } from '../adapters/capability-adapter.js';
import { McpToolError } from '../adapters/capability-adapter.js';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

/**
 * Narrow facade over `McpServer.registerTool`. Typed via `unknown` so the SDK's
 * bundled-Zod generics are never unified with ours (see the design note).
 */
type RegisterToolFacade = (
  name: string,
  config: { description: string; inputSchema: ZodRawShape },
  handler: (input: unknown) => Promise<ToolResult>,
) => void;

function ok(payload: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

function fail(error: unknown): ToolResult {
  const message =
    error instanceof McpToolError ? error.message : 'The action could not be completed.';
  return { content: [{ type: 'text', text: message }], isError: true };
}

interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ZodRawShape;
  readonly run: (input: unknown) => Promise<unknown>;
}

export function registerTools(server: McpServer, adapter: CapabilityAdapter): void {
  // Bind to preserve `this` (the SDK's registerTool uses instance state); the
  // cast decouples our Zod types from the SDK's bundled Zod (see design note).
  const register = (server.registerTool.bind(server) as unknown) as RegisterToolFacade;

  const specs: ToolSpec[] = [
    {
      name: 'find_courses',
      description: 'Search, filter, sort, and paginate the published course catalogue.',
      inputSchema: {
        keyword: z.string().max(200).optional(),
        discipline: z.array(z.string()).optional(),
        category: z.array(z.string()).optional(),
        courseType: z.array(z.string()).optional(),
        level: z.array(z.string()).optional(),
        deliveryMode: z.array(z.string()).optional(),
        availability: z.array(z.string()).optional(),
        sort: z.enum(['relevance', 'title', 'duration', 'fee', 'startDate']).optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(48).optional(),
      },
      run: (input) => adapter.findCourses(input),
    },
    {
      name: 'get_course_details',
      description: 'Retrieve full details for a single course by id.',
      inputSchema: { courseId: z.string().min(1).max(200) },
      run: (input) => adapter.getCourseDetails(input),
    },
    {
      name: 'compare_courses',
      description:
        'Compare a shortlist of courses side by side (composed from course details).',
      inputSchema: { courseIds: z.array(z.string().min(1).max(200)).min(2).max(4) },
      run: (input) => adapter.compareCourses(input),
    },
    {
      name: 'prepare_enquiry',
      description:
        'Assemble a draft enquiry for review and report which required fields remain.',
      inputSchema: {
        courseId: z.string().min(1).max(200),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        enquiryType: z.string().optional(),
        message: z.string().optional(),
      },
      run: (input) => adapter.prepareEnquiry(input),
    },
    {
      name: 'validate_enquiry',
      description:
        'Validate a candidate enquiry (advisory; the backend re-validates on submit).',
      inputSchema: {
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        courseId: z.string().optional(),
        enquiryType: z.string().optional(),
        message: z.string().optional(),
      },
      run: (input) => adapter.validateEnquiry(input),
    },
    {
      name: 'list_enquiries',
      description: 'List submitted enquiries (newest first).',
      // READ with no inputs — an empty shape advertises a parameterless tool.
      inputSchema: {},
      run: () => adapter.listEnquiries(),
    },
    {
      name: 'submit_enquiry',
      description:
        'Submit an enquiry for a course. Requires explicit human approval before submission.',
      inputSchema: {
        name: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        courseId: z.string(),
        enquiryType: z.enum([
          'general',
          'course_content',
          'fees_funding',
          'admissions',
          'other',
        ]),
        message: z.string(),
      },
      run: (input) => adapter.submitEnquiry(input),
    },
  ];

  for (const spec of specs) {
    register(
      spec.name,
      { description: spec.description, inputSchema: spec.inputSchema },
      async (input: unknown) => {
        try {
          return ok(await spec.run(input));
        } catch (error) {
          return fail(error);
        }
      },
    );
  }
}

/** The tool names this server advertises (navigation is excluded, D2). */
export const MCP_TOOL_NAMES = [
  'find_courses',
  'get_course_details',
  'compare_courses',
  'prepare_enquiry',
  'validate_enquiry',
  'list_enquiries',
  'submit_enquiry',
] as const;
