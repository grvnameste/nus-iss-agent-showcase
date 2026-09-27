import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Transcript } from './Transcript';
import type { OrchestrationResult } from '@/agent/orchestrator';
import type { ToolCallView } from './ToolCallCard';

const kindOf = (name: string): ToolCallView['kind'] =>
  name === 'submit_enquiry' ? 'WRITE' : name === 'navigate_to_course' ? 'NAVIGATION' : 'READ';

describe('Transcript (Spec 14 §4, §6)', () => {
  it('prompts to begin when there is no result', () => {
    render(<Transcript result={null} kindOf={kindOf} />);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('renders tool-call cards for step entries in order', () => {
    const result: OrchestrationResult = {
      transcript: [
        { type: 'step', step: { capability: 'find_courses', input: {}, output: { data: [] } } },
        { type: 'step', step: { capability: 'get_course_details', input: { courseId: 'c1' }, output: {} } },
        { type: 'stopped', reason: 'done' },
      ],
      history: [],
      stopped: 'done',
    };
    render(<Transcript result={result} kindOf={kindOf} />);
    expect(screen.getByText('find_courses')).toBeInTheDocument();
    expect(screen.getByText('get_course_details')).toBeInTheDocument();
  });

  it('shows the submission confirmation on a successful done run', () => {
    const result: OrchestrationResult = {
      transcript: [
        {
          type: 'step',
          step: {
            capability: 'submit_enquiry',
            input: {},
            output: {
              reference: 'ENQ-2027-000001',
              courseTitle: 'Cloud Foundations',
              status: 'received',
              createdAt: '2027-01-01T00:00:00.000Z',
            },
          },
        },
      ],
      history: [
        {
          capability: 'submit_enquiry',
          input: {},
          output: {
            reference: 'ENQ-2027-000001',
            courseTitle: 'Cloud Foundations',
            status: 'received',
            createdAt: '2027-01-01T00:00:00.000Z',
          },
        },
      ],
      stopped: 'done',
    };
    render(<Transcript result={result} kindOf={kindOf} />);
    expect(screen.getByRole('heading', { name: /enquiry submitted/i })).toBeInTheDocument();
    expect(screen.getByText('ENQ-2027-000001')).toBeInTheDocument();
    expect(screen.getByText('Cloud Foundations')).toBeInTheDocument();
  });

  it('shows a cancelled state when the run was declined', () => {
    const result: OrchestrationResult = {
      transcript: [{ type: 'stopped', reason: 'declined', text: 'Submission was declined.' }],
      history: [],
      stopped: 'declined',
    };
    render(<Transcript result={result} kindOf={kindOf} />);
    expect(screen.getByText(/nothing was submitted/i)).toBeInTheDocument();
  });
});
