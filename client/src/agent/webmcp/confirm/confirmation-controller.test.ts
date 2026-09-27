import { describe, expect, it } from 'vitest';
import { ConfirmationController } from './confirmation-controller';

const request = {
  capabilityName: 'submit_enquiry',
  summary: 'Submit an enquiry?',
  details: { fieldsBeingSent: ['name', 'email'] },
};

describe('ConfirmationController', () => {
  it('resolves true when approved', async () => {
    const c = new ConfirmationController();
    const promise = c.requester(request);
    // The dialog would render from the pending state; approve programmatically.
    c.current()?.approve();
    await expect(promise).resolves.toBe(true);
    expect(c.current()).toBeNull();
  });

  it('resolves false when declined', async () => {
    const c = new ConfirmationController();
    const promise = c.requester(request);
    c.current()?.decline();
    await expect(promise).resolves.toBe(false);
    expect(c.current()).toBeNull();
  });

  it('declines a concurrent second request (one decision at a time)', async () => {
    const c = new ConfirmationController();
    const first = c.requester(request);
    const second = c.requester(request);
    await expect(second).resolves.toBe(false); // immediately declined
    c.current()?.approve();
    await expect(first).resolves.toBe(true);
  });

  it('notifies subscribers of pending changes', async () => {
    const c = new ConfirmationController();
    const seen: boolean[] = [];
    c.subscribe((p) => seen.push(p !== null));
    const promise = c.requester(request);
    c.current()?.decline();
    await promise;
    expect(seen).toEqual([true, false]);
  });
});
