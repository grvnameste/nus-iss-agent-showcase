import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDeniedError } from '@/lib/webmcp';
import { AgentPanel } from './AgentPanel';
import type { CapabilityClient, CapabilityInfo, ScriptedJourney } from '@/agent/orchestrator';
import type { ToolCallView } from './ToolCallCard';

/**
 * Spec 14 panel integration tests. A fake capability client + fixed journey keep
 * the flow deterministic (no network/LLM). We assert the transcript renders and
 * that a declined confirmation surfaces the cancelled state.
 *
 * The panel builds its own ConfirmationController for the WRITE dialog; to keep
 * these tests focused on the panel's rendering, the fake client resolves
 * `submit_enquiry` directly (approve) or throws ConfirmationDeniedError (decline),
 * standing in for the confirmed/declined outcomes the real pipeline produces.
 */

const CAPS: CapabilityInfo[] = [
  { name: 'find_courses', description: '', kind: 'READ' },
  { name: 'get_course_details', description: '', kind: 'READ' },
  { name: 'compare_courses', description: '', kind: 'READ' },
  { name: 'navigate_to_course', description: '', kind: 'NAVIGATION' },
  { name: 'prepare_enquiry', description: '', kind: 'READ' },
  { name: 'validate_enquiry', description: '', kind: 'READ' },
  { name: 'submit_enquiry', description: '', kind: 'WRITE' },
];

const kindOf = (name: string): ToolCallView['kind'] =>
  CAPS.find((c) => c.name === name)?.kind ?? 'READ';

const journey: ScriptedJourney = {
  keyword: 'cloud',
  compareIds: ['c1', 'c2'],
  chosenCourseId: 'c1',
  enquiry: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    enquiryType: 'general',
    message: 'I would like to know more about this course please.',
  },
};

function fakeClient(opts: { decline?: boolean } = {}): CapabilityClient {
  return {
    list: () => CAPS,
    invoke: async (name: string) => {
      if (name === 'submit_enquiry') {
        if (opts.decline) throw new ConfirmationDeniedError('submit_enquiry');
        return {
          reference: 'ENQ-2027-000001',
          courseId: 'c1',
          courseTitle: 'Cloud Foundations',
          status: 'received',
          createdAt: '2027-01-01T00:00:00.000Z',
        };
      }
      return { ok: true, data: [] };
    },
  };
}

describe('AgentPanel (Spec 14)', () => {
  it('has a single H1-free panel with a request input and run button', () => {
    render(<AgentPanel client={fakeClient()} kindOf={kindOf} journey={journey} />);
    expect(screen.getByLabelText(/your request/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run agent/i })).toBeInTheDocument();
  });

  it('runs the journey and shows the submission confirmation on approve', async () => {
    render(<AgentPanel client={fakeClient()} kindOf={kindOf} journey={journey} />);
    await userEvent.click(screen.getByRole('button', { name: /run agent/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /enquiry submitted/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('ENQ-2027-000001')).toBeInTheDocument();
    // The WRITE tool-call card is present.
    expect(screen.getByText('submit_enquiry')).toBeInTheDocument();
  });

  it('shows the cancelled state when the submission is declined', async () => {
    render(<AgentPanel client={fakeClient({ decline: true })} kindOf={kindOf} journey={journey} />);
    await userEvent.click(screen.getByRole('button', { name: /run agent/i }));
    await waitFor(() =>
      expect(screen.getByText(/nothing was submitted/i)).toBeInTheDocument(),
    );
  });
});
