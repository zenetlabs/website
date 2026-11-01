import { afterEach, describe, expect, it, vi } from 'vitest';
import { webmcpCopy } from '@/content/en/webmcp';
import {
  type BookingProposal,
  type BookingRequest,
  hasPendingBooking,
  openConfirmation,
  type ToolEnvelope,
} from '@/lib/webmcp/confirmation';

const PROPOSAL: BookingProposal = {
  slot: '2027-01-05T09:00:00.000Z',
  topic: 'Automate our inbox triage',
  name: '',
  email: '',
  company: '',
  timeZone: 'Europe/Madrid',
};

const DECLINED: ToolEnvelope = { ok: true, result: { status: 'declined' } };
const CANCELLED: ToolEnvelope = { ok: true, result: { status: 'cancelled' } };
const BOOKED: ToolEnvelope = { ok: true, result: { status: 'booked' } };
const TAKEN: ToolEnvelope = {
  ok: true,
  result: { status: 'rejected', reason: 'slot_taken' },
};

function open(
  signal?: AbortSignal,
  mount?: (request: BookingRequest) => () => void,
) {
  const unmount = vi.fn();
  const requests: BookingRequest[] = [];
  const answer = openConfirmation({
    proposal: PROPOSAL,
    label: 'Tuesday 5 January, 10:00 am',
    locale: 'en',
    copy: webmcpCopy.dialog,
    signal,
    mount:
      mount ??
      ((request) => {
        requests.push(request);
        everyRequest.push(request);
        return unmount;
      }),
  });
  return { answer, unmount, request: requests[0] };
}

const everyRequest: BookingRequest[] = [];

// The store is module state: release whatever a test left open.
afterEach(() => {
  for (const request of everyRequest.splice(0)) {
    request.finish(DECLINED, false);
    request.dismiss();
  }
});

describe('confirmation', () => {
  it('mounts the request and refuses a second one while it is open', async () => {
    const first = open();
    expect(first.request?.proposal).toEqual(PROPOSAL);
    expect(hasPendingBooking()).toBe(true);
    expect(open().answer).toBeNull();
    first.request?.dismiss();
    expect(first.unmount).toHaveBeenCalledOnce();
    expect(hasPendingBooking()).toBe(false);
    await expect(first.answer).resolves.toEqual(DECLINED);
  });

  it('answers once, whatever happens afterwards', async () => {
    const { answer, request } = open();
    request?.begin();
    request?.finish(BOOKED, true);
    request?.finish(TAKEN, false);
    request?.dismiss();
    await expect(answer).resolves.toEqual(BOOKED);
  });

  it('answers cancelled and takes the dialog down when the agent aborts before submit', async () => {
    const controller = new AbortController();
    const { answer, unmount, request } = open(controller.signal);
    controller.abort();
    await expect(answer).resolves.toEqual(CANCELLED);
    expect(unmount).toHaveBeenCalledOnce();
    expect(hasPendingBooking()).toBe(false);
    expect(request?.begin()).toBe(false);
  });

  it('answers cancelled without mounting when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { answer, request } = open(controller.signal);
    await expect(answer).resolves.toEqual(CANCELLED);
    expect(request).toBeUndefined();
    expect(hasPendingBooking()).toBe(false);
  });

  describe('while a booking is being sent', () => {
    it('cannot be dismissed, so the agent gets the real outcome', async () => {
      const { answer, request, unmount } = open();
      expect(request?.begin()).toBe(true);
      request?.dismiss();
      expect(request?.isHeld()).toBe(true);
      expect(unmount).not.toHaveBeenCalled();
      request?.finish(BOOKED, true);
      request?.dismiss();
      expect(unmount).toHaveBeenCalledOnce();
      await expect(answer).resolves.toEqual(BOOKED);
    });

    it('remembers an abort and answers the booking if it went through', async () => {
      const controller = new AbortController();
      const { answer, request, unmount } = open(controller.signal);
      request?.begin();
      controller.abort();
      expect(unmount).not.toHaveBeenCalled();
      request?.finish(BOOKED, true);
      await expect(answer).resolves.toEqual(BOOKED);
      expect(unmount).not.toHaveBeenCalled();
    });

    it('remembers an abort and answers cancelled if the booking failed', async () => {
      const controller = new AbortController();
      const { answer, request, unmount } = open(controller.signal);
      request?.begin();
      controller.abort();
      request?.finish(TAKEN, false);
      await expect(answer).resolves.toEqual(CANCELLED);
      expect(unmount).toHaveBeenCalledOnce();
      expect(request?.begin()).toBe(false);
    });

    it('closes after a failed security check when the agent aborted meanwhile', async () => {
      const controller = new AbortController();
      const { answer, request, unmount } = open(controller.signal);
      request?.begin();
      controller.abort();
      request?.retry();
      await expect(answer).resolves.toEqual(CANCELLED);
      expect(unmount).toHaveBeenCalledOnce();
    });

    it('lets the visitor retry after a failed security check', () => {
      const { request } = open();
      request?.begin();
      request?.retry();
      expect(request?.isHeld()).toBe(false);
      expect(request?.begin()).toBe(true);
    });
  });

  it('keeps the dialog after the answer when the agent aborts later', () => {
    const controller = new AbortController();
    const { request, unmount } = open(controller.signal);
    request?.begin();
    request?.finish(BOOKED, true);
    controller.abort();
    expect(unmount).not.toHaveBeenCalled();
    request?.dismiss();
    expect(unmount).toHaveBeenCalledOnce();
  });

  describe('after a terminal answer', () => {
    it('lets a new proposal replace the old dialog instead of answering busy', async () => {
      const first = open();
      first.request?.begin();
      first.request?.finish(TAKEN, false);
      await expect(first.answer).resolves.toEqual(TAKEN);
      expect(hasPendingBooking()).toBe(false);

      const retry = open();
      expect(retry.answer).not.toBeNull();
      expect(first.unmount).toHaveBeenCalledOnce();
      expect(hasPendingBooking()).toBe(true);
      retry.request?.begin();
      retry.request?.finish(BOOKED, true);
      await expect(retry.answer).resolves.toEqual(BOOKED);

      const third = open();
      expect(third.answer).not.toBeNull();
      expect(retry.unmount).toHaveBeenCalledOnce();
      third.request?.dismiss();
      await expect(third.answer).resolves.toEqual(DECLINED);
    });
  });

  it('does not stay busy when the dialog cannot be mounted', async () => {
    const failed = open(undefined, () => {
      throw new Error('chunk gone');
    });
    await expect(failed.answer).resolves.toEqual({
      ok: false,
      error: 'unavailable',
    });
    expect(hasPendingBooking()).toBe(false);
    const next = open();
    expect(next.answer).not.toBeNull();
    next.request?.dismiss();
  });
});
