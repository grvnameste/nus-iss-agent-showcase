import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolCallCard, toToolCallView, type ToolCallView } from './ToolCallCard';
import type { PastStep } from '@/agent/orchestrator';

describe('ToolCallCard (Spec 14 §4)', () => {
  const base: ToolCallView = {
    capability: 'find_courses',
    kind: 'READ',
    status: 'success',
    input: { keyword: 'cloud' },
    output: { data: [] },
  };

  it('shows the capability, kind badge, and status label (text + glyph)', () => {
    render(<ul><ToolCallCard view={base} /></ul>);
    expect(screen.getByText('find_courses')).toBeInTheDocument();
    expect(screen.getByText('READ')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('input/output are collapsed by default and expand on click', async () => {
    render(<ul><ToolCallCard view={base} /></ul>);
    expect(screen.queryByText(/"keyword"/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show details/i }));
    expect(screen.getByText(/"keyword"/)).toBeInTheDocument();
    expect(screen.getByText(/Output/)).toBeInTheDocument();
  });

  it('renders a WRITE badge and error message for a failed step', () => {
    const view: ToolCallView = {
      capability: 'submit_enquiry',
      kind: 'WRITE',
      status: 'error',
      input: {},
      error: 'The action could not be completed.',
    };
    render(<ul><ToolCallCard view={view} /></ul>);
    expect(screen.getByText('WRITE')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('The action could not be completed.')).toBeInTheDocument();
  });

  it('toToolCallView infers success/error status from the step', () => {
    const okStep: PastStep = { capability: 'find_courses', input: {}, output: { data: [] } };
    const errStep: PastStep = { capability: 'submit_enquiry', input: {}, error: 'nope' };
    expect(toToolCallView(okStep, 'READ').status).toBe('success');
    expect(toToolCallView(errStep, 'WRITE').status).toBe('error');
  });
});
