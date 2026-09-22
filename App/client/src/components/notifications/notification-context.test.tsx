import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NotificationProvider,
  useNotify,
  useOptionalNotify,
} from './notification-context';

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <NotificationProvider>{children}</NotificationProvider>;
}

function renderNotify() {
  return renderHook(() => useNotify(), { wrapper });
}

describe('useNotify', () => {
  it('starts with no notifications', () => {
    const { result } = renderNotify();

    expect(result.current.notifications).toEqual([]);
  });

  it('surfaces a notification and returns its id', () => {
    const { result } = renderNotify();

    let id = '';
    act(() => {
      id = result.current.notify({ message: 'Enquiry submitted', tone: 'success' });
    });

    expect(id).not.toBe('');
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      id,
      message: 'Enquiry submitted',
      tone: 'success',
    });
  });

  it('defaults the tone to info when omitted', () => {
    const { result } = renderNotify();

    act(() => {
      result.current.notify({ message: 'Comparison updated' });
    });

    expect(result.current.notifications[0]?.tone).toBe('info');
  });

  it('dismisses a single notification by id', () => {
    const { result } = renderNotify();

    let id = '';
    act(() => {
      result.current.notify({ message: 'first' });
      id = result.current.notify({ message: 'second' });
    });
    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]?.message).toBe('first');
  });

  it('clears every notification', () => {
    const { result } = renderNotify();

    act(() => {
      result.current.notify({ message: 'a' });
      result.current.notify({ message: 'b' });
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.notifications).toEqual([]);
  });
});

describe('notification live regions (FR-621, NFR-605)', () => {
  it('renders a polite live region that carries non-error messages', () => {
    function Surface(): React.JSX.Element {
      const { notify } = useNotify();
      return (
        <button type="button" onClick={() => notify({ message: 'Saved', tone: 'success' })}>
          notify
        </button>
      );
    }

    render(
      <NotificationProvider>
        <Surface />
      </NotificationProvider>,
    );

    const polite = screen.getByTestId('notification-region-polite');
    expect(polite).toHaveAttribute('aria-live', 'polite');

    act(() => {
      screen.getByRole('button', { name: 'notify' }).click();
    });

    expect(within(polite).getByText(/Saved/)).toBeInTheDocument();
    // Colour independence: severity is conveyed by a textual label.
    expect(within(polite).getByText(/Success:/)).toBeInTheDocument();
  });

  it('routes errors to the assertive region so they interrupt (NFR-605)', () => {
    const { result } = renderNotify();

    const assertive = screen.getByTestId('notification-region-assertive');
    expect(assertive).toHaveAttribute('aria-live', 'assertive');

    act(() => {
      result.current.notify({ message: 'Submission failed', tone: 'error' });
    });

    expect(within(assertive).getByText(/Submission failed/)).toBeInTheDocument();
    expect(within(assertive).getByText(/Error:/)).toBeInTheDocument();
    // The error must not leak into the polite region.
    const polite = screen.getByTestId('notification-region-polite');
    expect(within(polite).queryByText(/Submission failed/)).not.toBeInTheDocument();
  });
});

describe('visible, dismissible presentation (FR-621, NFR-605)', () => {
  function Surface(): React.JSX.Element {
    const { notify } = useNotify();
    return (
      <button
        type="button"
        onClick={() => notify({ message: 'Enquiry submitted — reference ENQ-1.', tone: 'success' })}
      >
        notify
      </button>
    );
  }

  it('shows the message visibly with a colour-independent textual tone label', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Surface />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'notify' }));

    const polite = screen.getByTestId('notification-region-polite');
    // The textual label — not colour — conveys severity.
    expect(within(polite).getByText('Success:')).toBeInTheDocument();
    expect(within(polite).getByText(/Enquiry submitted — reference ENQ-1\./)).toBeInTheDocument();
  });

  it('lets the user dismiss a toast with a keyboard-operable control', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Surface />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'notify' }));
    const dismiss = screen.getByRole('button', { name: /dismiss success notification/i });
    await user.click(dismiss);

    const polite = screen.getByTestId('notification-region-polite');
    expect(within(polite).queryByText(/Enquiry submitted/)).not.toBeInTheDocument();
  });
});

describe('useNotify outside a provider', () => {
  it('fails loudly rather than silently swallowing feedback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useNotify())).toThrowError(/NotificationProvider/i);
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('useOptionalNotify', () => {
  it('returns null outside a provider so features degrade rather than throw', () => {
    const { result } = renderHook(() => useOptionalNotify());
    expect(result.current).toBeNull();
  });

  it('returns the channel inside a provider', () => {
    const { result } = renderHook(() => useOptionalNotify(), { wrapper });
    expect(result.current).not.toBeNull();
    expect(typeof result.current?.notify).toBe('function');
  });
});
