import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from './ConfirmationDialog';
import type { PendingConfirmation } from './confirmation-controller';

function pending(overrides: Partial<PendingConfirmation> = {}): PendingConfirmation {
  return {
    request: {
      capabilityName: 'submit_enquiry',
      summary: 'Submit a "general" enquiry about Cloud Foundations? Your name, email will be sent.',
      details: { fieldsBeingSent: ['name', 'email'], enquiryType: 'general' },
    },
    approve: vi.fn(),
    decline: vi.fn(),
    ...overrides,
  };
}

describe('ConfirmationDialog', () => {
  it('renders nothing when idle', () => {
    const { container } = render(<ConfirmationDialog pending={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an accessible dialog with the summary and field names', () => {
    render(<ConfirmationDialog pending={pending()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /confirm submission/i })).toBeInTheDocument();
    expect(screen.getByText(/Cloud Foundations/)).toBeInTheDocument();
    expect(screen.getByText(/Fields being sent: name, email/)).toBeInTheDocument();
  });

  it('approve button calls approve', async () => {
    const p = pending();
    render(<ConfirmationDialog pending={p} />);
    await userEvent.click(screen.getByRole('button', { name: /submit enquiry/i }));
    expect(p.approve).toHaveBeenCalledOnce();
  });

  it('cancel button calls decline', async () => {
    const p = pending();
    render(<ConfirmationDialog pending={p} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(p.decline).toHaveBeenCalledOnce();
  });

  it('Escape declines', async () => {
    const p = pending();
    render(<ConfirmationDialog pending={p} />);
    await userEvent.keyboard('{Escape}');
    expect(p.decline).toHaveBeenCalledOnce();
  });

  it('moves initial focus to Cancel', () => {
    const p = pending();
    render(<ConfirmationDialog pending={p} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
  });
});
