/**
 * Scripted (deterministic) planner (Spec 13 §4).
 *
 * Drives the reference journey (Spec 13 §6) as a fixed, deterministic sequence —
 * no LLM, no network — so the orchestration is fully testable and can power an
 * offline demo. It advances one step per turn based on `history.length`, and
 * transparently **skips `navigate_to_course`** when that capability is not
 * advertised by the active interface (e.g. an MCP-backed client), demonstrating
 * the transport-agnostic behaviour (FR-1302.2).
 *
 * The scripted planner presents options and prepares the enquiry, but the choice
 * of course is provided by the caller — the agent does not autonomously pick what
 * to enquire about (FR-1303.2).
 */
import type { Planner, PlannerAction, PlannerState } from './planner';

export interface ScriptedJourney {
  /** Keyword the learner is searching for (e.g. "cloud"). */
  readonly keyword: string;
  /** Course ids to compare (chosen by the user/caller, not the agent). */
  readonly compareIds: readonly string[];
  /** The course the user chose to enquire about. */
  readonly chosenCourseId: string;
  /** The enquiry the user reviewed and wants to submit. */
  readonly enquiry: {
    readonly name: string;
    readonly email: string;
    readonly phone?: string;
    readonly enquiryType: string;
    readonly message: string;
  };
}

/** The ordered capability steps of the reference journey. */
type StepName =
  | 'find_courses'
  | 'get_course_details'
  | 'compare_courses'
  | 'navigate_to_course'
  | 'prepare_enquiry'
  | 'validate_enquiry'
  | 'submit_enquiry';

const ORDER: readonly StepName[] = [
  'find_courses',
  'get_course_details',
  'compare_courses',
  'navigate_to_course',
  'prepare_enquiry',
  'validate_enquiry',
  'submit_enquiry',
];

export function createScriptedPlanner(journey: ScriptedJourney): Planner {
  return {
    next(state: PlannerState): PlannerAction {
      const available = new Set(state.capabilities.map((c) => c.name));
      // Steps already executed = history length; find the next applicable step,
      // skipping any capability the active interface does not advertise.
      const doneCount = state.history.length;
      let index = 0;
      let seen = 0;
      for (; index < ORDER.length; index += 1) {
        const step = ORDER[index]!;
        if (!available.has(step)) continue; // skip unavailable (e.g. navigation on MCP)
        if (seen === doneCount) break;
        seen += 1;
      }
      if (index >= ORDER.length) {
        return { type: 'done', text: 'Journey complete.' };
      }
      return { type: 'call', capability: ORDER[index]!, input: inputFor(ORDER[index]!, journey) };
    },
  };
}

function inputFor(step: StepName, j: ScriptedJourney): unknown {
  switch (step) {
    case 'find_courses':
      return { keyword: j.keyword };
    case 'get_course_details':
      return { courseId: j.chosenCourseId };
    case 'compare_courses':
      return { courseIds: [...j.compareIds] };
    case 'navigate_to_course':
      return { courseId: j.chosenCourseId };
    case 'prepare_enquiry':
      return { courseId: j.chosenCourseId, ...j.enquiry };
    case 'validate_enquiry':
      return { courseId: j.chosenCourseId, ...j.enquiry };
    case 'submit_enquiry':
      return { courseId: j.chosenCourseId, ...j.enquiry };
  }
}
