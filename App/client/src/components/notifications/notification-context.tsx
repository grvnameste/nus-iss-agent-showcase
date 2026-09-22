'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Global, lightweight notification channel (Specification 06, FR-621, AD-603,
 * design §5).
 *
 * This is an integration-owned *shell* concern: a single, accessible place to
 * surface transient cross-feature feedback (e.g. "Enquiry submitted", "Comparison
 * is full"). It carries **no business logic** — features decide *what* to say and
 * *when*; this provider only renders those messages in an `aria-live` region so
 * they are announced to assistive technology and are never conveyed by colour
 * alone (NFR-605).
 *
 * The `useNotify()` hook is defined here so the channel is complete. TASK-615
 * added the visible toast presentation and adopted the channel for cross-feature
 * feedback (comparison-at-capacity, enquiry submitted) without removing any
 * feature-local status regions — notifications are additive.
 */

/**
 * Severity of a notification. A discriminated tone drives both the `aria-live`
 * politeness (errors are `assertive`, everything else `polite`) and a
 * colour-independent textual label, so meaning never depends on colour.
 */
export type NotificationTone = 'info' | 'success' | 'error';

export interface Notification {
  /** Stable identity for React keys and dismissal. */
  id: string;
  /** The human-readable message to announce and display. */
  message: string;
  /** Severity; defaults to `info` when a caller omits it. */
  tone: NotificationTone;
}

/** Input accepted by `notify` — the `id` and `tone` default are filled in. */
export interface NotifyInput {
  message: string;
  tone?: NotificationTone;
}

export interface NotificationApi {
  /** Currently visible notifications, oldest first. */
  notifications: Notification[];
  /** Surface a notification; returns its generated id. */
  notify: (input: NotifyInput) => string;
  /** Dismiss a single notification by id (a no-op if unknown). */
  dismiss: (id: string) => void;
  /** Dismiss every notification. */
  clear: () => void;
}

const NotificationContext = createContext<NotificationApi | null>(null);

/** Colour-independent prefix so the tone is legible without relying on styling. */
const TONE_LABEL: Record<NotificationTone, string> = {
  info: 'Info',
  success: 'Success',
  error: 'Error',
};

/**
 * A text glyph per tone. Purely decorative (`aria-hidden`) — the textual
 * `TONE_LABEL` is the accessible cue. Glyphs (not colour) give sighted users a
 * secondary, shape-based signal, mirroring the `AvailabilityBadge` convention.
 */
const TONE_GLYPH: Record<NotificationTone, string> = {
  info: 'ℹ',
  success: '✓',
  error: '⚠',
};

/**
 * Secondary colour cue only. Meaning is never conveyed by colour alone
 * (NFR-605): the textual label and glyph already carry the tone.
 */
const TONE_CLASSNAME: Record<NotificationTone, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  error: 'border-red-300 bg-red-50 text-red-900',
};

let notificationSequence = 0;

function nextNotificationId(): string {
  notificationSequence += 1;
  return `notification-${notificationSequence}`;
}

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((input: NotifyInput): string => {
    const id = nextNotificationId();
    const tone: NotificationTone = input.tone ?? 'info';
    setNotifications((current) => [...current, { id, message: input.message, tone }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string): void => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback((): void => {
    setNotifications([]);
  }, []);

  const value = useMemo<NotificationApi>(
    () => ({ notifications, notify, dismiss, clear }),
    [notifications, notify, dismiss, clear],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationRegion notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

/**
 * The accessible output surface for notifications. Two always-present live
 * regions are rendered — one `polite`, one `assertive` — because a live region
 * inserted at the moment of a change is frequently not announced; the regions
 * must outlive any individual message (mirrors the comparison announcer pattern).
 *
 * Errors go to the `assertive` region so they interrupt; everything else is
 * `polite`. Each message carries a textual tone label so severity is conveyed by
 * text, not colour (NFR-605).
 *
 * The region is also a *visible* toast stack: a fixed, presentation-only overlay
 * so sighted users see the same feedback that assistive technology announces.
 * Each toast is dismissible; the visible layer adds no business logic and does
 * not change the live-region semantics.
 */
function NotificationRegion({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}): React.JSX.Element {
  const polite = notifications.filter((item) => item.tone !== 'error');
  const assertive = notifications.filter((item) => item.tone === 'error');

  return (
    <div
      // Fixed overlay in the corner; `pointer-events-none` so the empty region
      // never intercepts clicks — individual toasts re-enable their own events.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      <div
        role="status"
        aria-live="polite"
        data-testid="notification-region-polite"
        className="flex w-full flex-col items-center gap-2 sm:items-end"
      >
        {polite.map((item) => (
          <NotificationToast key={item.id} notification={item} onDismiss={onDismiss} />
        ))}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        data-testid="notification-region-assertive"
        className="flex w-full flex-col items-center gap-2 sm:items-end"
      >
        {assertive.map((item) => (
          <NotificationToast key={item.id} notification={item} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

/**
 * A single visible, dismissible toast. Presentation only: the textual tone
 * label and glyph carry the meaning; colour is a secondary cue. The dismiss
 * control is a real, keyboard-operable button with an accessible name.
 */
function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-sm',
        TONE_CLASSNAME[notification.tone],
      )}
    >
      <span aria-hidden="true" className="mt-0.5 font-semibold">
        {TONE_GLYPH[notification.tone]}
      </span>
      <p className="flex-1">
        <span className="font-semibold">{TONE_LABEL[notification.tone]}:</span>{' '}
        {notification.message}
      </p>
      <button
        type="button"
        aria-label={`Dismiss ${TONE_LABEL[notification.tone].toLowerCase()} notification`}
        onClick={() => onDismiss(notification.id)}
        className="rounded p-0.5 font-semibold leading-none text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

/**
 * The shared notification interface. Throws outside a `NotificationProvider` so
 * a missing mount surfaces immediately rather than swallowing feedback the user
 * was meant to see.
 */
export function useNotify(): NotificationApi {
  const context = useContext(NotificationContext);
  if (context === null) {
    throw new Error('useNotify must be used within a NotificationProvider.');
  }
  return context;
}

/**
 * Non-throwing variant that returns `null` when no `NotificationProvider` is
 * mounted. For feature components that treat the global notification as an
 * *additive enhancement* over their own local live region (e.g. the comparison
 * control, whose `useComparison()` already announces the outcome): the feature
 * must stay renderable in isolation, so a missing channel degrades silently
 * rather than throwing. Consumers that *require* feedback use `useNotify()`.
 */
export function useOptionalNotify(): NotificationApi | null {
  return useContext(NotificationContext);
}
