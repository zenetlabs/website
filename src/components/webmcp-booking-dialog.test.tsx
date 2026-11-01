import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebMcpBookingDialog } from '@/components/webmcp-booking-dialog';
import { webmcpCopy as en } from '@/content/en/webmcp';
import { webmcpCopy as es } from '@/content/es/webmcp';
import type { Locale } from '@/lib/i18n';
import { messages } from '@/lib/i18n';
import {
  type BookingRequest,
  openConfirmation,
  type ToolEnvelope,
} from '@/lib/webmcp/confirmation';
import { mountDialog } from '@/lib/webmcp/mount';

const submitBooking = vi.hoisted(() => vi.fn());
const attribution = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
const BOOKED: ToolEnvelope = {
  ok: true,
  result: {
    status: 'booked',
    start: '2027-01-05T09:00:00.000Z',
    end: '2027-01-05T09:30:00.000Z',
    label: 'Tuesday 5 January, 10:00 am',
    meetUrl: 'https://meet.example/abc',
  },
};
const CANCELLED: ToolEnvelope = { ok: true, result: { status: 'cancelled' } };
const TAKEN: ToolEnvelope = {
  ok: true,
  result: { status: 'rejected', reason: 'slot_taken' },
};
const ATTRIBUTION = { landing: '/', referrer: '', page: '/pricing' };
// Tuesday 5 January 2027, 09:00 UTC.
const COPY = { en, es };
const SLOT = '2027-01-05T09:00:00.000Z';
const PROPOSAL = {
  slot: SLOT,
  topic: 'Automate our inbox triage',
  name: 'Ada',
  email: '',
  company: '',
  timeZone: 'Europe/Madrid',
};

vi.mock('@/lib/booking-client', () => ({ submitBooking }));
vi.mock('@/lib/lead-client', () => ({ attribution }));
vi.mock('@/lib/track', () => ({ track }));
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess('tok_book')}>
      solve challenge
    </button>
  ),
}));

let last: BookingRequest | null = null;

function open(locale: Locale = 'en', signal?: AbortSignal) {
  const requests: BookingRequest[] = [];
  const opened = openConfirmation({
    proposal: PROPOSAL,
    label: 'Tuesday 5 January, 10:00 am',
    locale,
    copy: COPY[locale].dialog,
    signal,
    mount: (request) => {
      requests.push(request);
      return () => undefined;
    },
  });
  const [request] = requests;
  if (opened === null || request === undefined) throw new Error('not open');
  const answers: ToolEnvelope[] = [];
  opened.then(
    (envelope) => answers.push(envelope),
    () => undefined,
  );
  last = request;
  render(<WebMcpBookingDialog request={request} />);
  return { request, answers };
}

afterEach(() => {
  last?.finish(CANCELLED, false);
  last?.dismiss();
  last = null;
});

beforeEach(() => {
  submitBooking.mockReset();
  track.mockReset();
  attribution.mockReset().mockResolvedValue(ATTRIBUTION);
});

async function fill(user: ReturnType<typeof userEvent.setup>, locale: Locale) {
  const { form } = messages[locale].contact;
  await user.type(screen.getByLabelText(form.email), 'ada@example.com');
  await user.click(screen.getByRole('checkbox'));
  await user.click(await screen.findByText('solve challenge'));
}

describe('WebMcpBookingDialog', () => {
  for (const locale of ['en', 'es'] as const) {
    it(`opens modally with the ${locale} title, intro and time`, () => {
      open(locale);
      const { dialog } = COPY[locale];
      const element = screen.getByRole('dialog', { name: dialog.title });
      expect(element).toHaveAttribute('open');
      expect(element).toHaveAccessibleDescription(dialog.intro);
      expect(
        screen.getByText(/Tuesday 5 January, 10:00 am/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Europe\/Madrid/)).toBeInTheDocument();
    });
  }

  it('prefills the proposal, keeps it editable and leaves consent unticked', () => {
    open();
    const { form } = messages.en.contact;
    expect(screen.getByLabelText(form.name)).toHaveValue('Ada');
    expect(screen.getByLabelText(form.message)).toHaveValue(PROPOSAL.topic);
    expect(screen.getByLabelText(form.email)).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('checkbox')).toBeRequired();
  });

  it('keeps Confirm disabled until the challenge is solved', async () => {
    const user = userEvent.setup();
    open();
    const confirm = screen.getByRole('button', {
      name: en.dialog.confirm,
    });
    expect(confirm).toBeDisabled();
    await user.click(await screen.findByText('solve challenge'));
    expect(confirm).toBeEnabled();
  });

  it('declines on Cancel and never submits', async () => {
    const user = userEvent.setup();
    const { answers } = open();
    await user.click(screen.getByRole('button', { name: en.dialog.cancel }));
    await waitFor(() =>
      expect(answers).toEqual([{ ok: true, result: { status: 'declined' } }]),
    );
    expect(submitBooking).not.toHaveBeenCalled();
  });

  it('declines when the dialog is cancelled with Escape', async () => {
    const { answers } = open();
    const element = document.querySelector('dialog');
    act(() => {
      element?.dispatchEvent(new Event('cancel', { cancelable: true }));
      element?.close();
    });
    await waitFor(() =>
      expect(answers).toEqual([{ ok: true, result: { status: 'declined' } }]),
    );
    expect(submitBooking).not.toHaveBeenCalled();
  });

  it('submits the edited details with consent, token, honeypot, attribution, zone and locale', async () => {
    const user = userEvent.setup();
    submitBooking.mockResolvedValue({
      kind: 'booked',
      start: Date.parse(SLOT),
      end: Date.parse(SLOT) + 1_800_000,
      meetUrl: 'https://meet.example/abc',
      envelope: BOOKED,
    });
    const { answers } = open();
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    await waitFor(() => expect(submitBooking).toHaveBeenCalledOnce());
    expect(submitBooking).toHaveBeenCalledWith({
      slot: SLOT,
      name: 'Ada',
      email: 'ada@example.com',
      company: undefined,
      topic: PROPOSAL.topic,
      timeZone: 'Europe/Madrid',
      locale: 'en',
      consent: true,
      turnstileToken: 'tok_book',
      website: '',
      attribution: ATTRIBUTION,
    });
    const heading = await screen.findByRole('heading', {
      name: en.dialog.success.title,
    });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('link', { name: /Google Meet/ })).toHaveAttribute(
      'href',
      'https://meet.example/abc',
    );
    expect(answers).toEqual([BOOKED]);
    expect(track).toHaveBeenCalledWith('book_meeting');
    expect(track).toHaveBeenCalledWith('generate_lead', { method: 'webmcp' });
  });

  it('shows the alert with the mailto and tells the agent when the slot is taken', async () => {
    const user = userEvent.setup();
    submitBooking.mockResolvedValue({
      kind: 'rejected',
      reason: 'slot_taken',
      envelope: TAKEN,
    });
    const { answers } = open();
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(en.dialog.errors.taken);
    expect(
      screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
    ).toBeInTheDocument();
    expect(answers).toEqual([TAKEN]);
    expect(
      screen.queryByRole('button', { name: en.dialog.confirm }),
    ).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it('maps a failed send to an error envelope for the agent', async () => {
    const user = userEvent.setup();
    submitBooking.mockResolvedValue({
      kind: 'failed',
      error: 'rate',
      envelope: { ok: false, error: 'rate' },
    });
    const { answers } = open();
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    await screen.findByRole('alert');
    expect(answers).toEqual([{ ok: false, error: 'rate' }]);
  });

  it('lets the visitor retry after a failed security check without answering the agent', async () => {
    const user = userEvent.setup();
    submitBooking.mockResolvedValue({
      kind: 'failed',
      error: 'captcha',
      envelope: { ok: false, error: 'captcha' },
    });
    const { answers } = open();
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(en.dialog.errors.captcha);
    expect(answers).toEqual([]);
    expect(screen.getByLabelText(messages.en.contact.form.name)).toBeEnabled();
    expect(
      screen.getByRole('button', { name: en.dialog.confirm }),
    ).toBeDisabled();
  });

  it('does not close on Escape while the booking is being sent', async () => {
    const user = userEvent.setup();
    submitBooking.mockReturnValue(new Promise(() => undefined));
    open();
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    await screen.findByRole('button', {
      name: en.dialog.confirming,
    });
    const event = new Event('cancel', { cancelable: true });
    screen.getByRole('dialog').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('describes the dialog by its intro only while the form is shown', async () => {
    const user = userEvent.setup();
    submitBooking.mockResolvedValue({
      kind: 'booked',
      start: Date.parse(SLOT),
      end: Date.parse(SLOT) + 1_800_000,
      meetUrl: null,
      envelope: BOOKED,
    });
    open();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    await screen.findByRole('heading', { name: en.dialog.success.title });
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
  });

  it('ignores a synthetic submit without consent', async () => {
    const { answers } = open();
    const form = document.querySelector('dialog form');
    act(() => {
      form?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    await Promise.resolve();
    expect(submitBooking).not.toHaveBeenCalled();
    expect(answers).toEqual([]);
  });

  it('puts the dialog back when it is closed while the booking is being sent, and still answers with the booking', async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => undefined;
    submitBooking.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { answers } = open();
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    await screen.findByRole('button', { name: en.dialog.confirming });
    const element = document.querySelector('dialog');
    // A second Escape is not cancelable and closes the dialog.
    act(() => {
      element?.dispatchEvent(new Event('cancel', { cancelable: false }));
      element?.close();
    });
    expect(element?.open).toBe(true);
    expect(answers).toEqual([]);
    await act(async () => {
      finish({
        kind: 'booked',
        start: Date.parse(SLOT),
        end: Date.parse(SLOT) + 1_800_000,
        meetUrl: null,
        envelope: BOOKED,
      });
    });
    await screen.findByRole('heading', { name: en.dialog.success.title });
    await waitFor(() => expect(answers).toEqual([BOOKED]));
  });

  it('answers cancelled and closes when the agent aborted during a failed submit, and never posts again', async () => {
    const user = userEvent.setup();
    const controller = new AbortController();
    let finish: (value: unknown) => void = () => undefined;
    submitBooking.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { answers, request } = open('en', controller.signal);
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    await screen.findByRole('button', { name: en.dialog.confirming });
    controller.abort();
    expect(answers).toEqual([]);
    await act(async () => {
      finish({
        kind: 'rejected',
        reason: 'slot_taken',
        envelope: TAKEN,
      });
    });
    await waitFor(() => expect(answers).toEqual([CANCELLED]));
    expect(request.begin()).toBe(false);
    expect(submitBooking).toHaveBeenCalledOnce();
  });

  it('lets a retry with another slot open a fresh dialog after a terminal failure', async () => {
    const user = userEvent.setup();
    submitBooking.mockResolvedValue({
      kind: 'rejected',
      reason: 'slot_taken',
      envelope: TAKEN,
    });
    const first = open();
    await fill(user, 'en');
    await user.click(screen.getByRole('button', { name: en.dialog.confirm }));
    await screen.findByRole('alert');
    await waitFor(() => expect(first.answers).toEqual([TAKEN]));
    const requests: BookingRequest[] = [];
    const next = openConfirmation({
      proposal: { ...PROPOSAL, slot: '2027-01-05T10:00:00.000Z' },
      label: 'Tuesday 5 January, 11:00 am',
      locale: 'en',
      copy: en.dialog,
      signal: undefined,
      mount: (request) => {
        requests.push(request);
        return () => undefined;
      },
    });
    expect(next).not.toBeNull();
    last = requests[0] ?? null;
    last?.dismiss();
    await expect(next).resolves.toEqual({
      ok: true,
      result: { status: 'declined' },
    });
  });

  it('mounts on its own node and removes it when the request is dismissed', async () => {
    const requests: BookingRequest[] = [];
    const opened = openConfirmation({
      proposal: PROPOSAL,
      label: 'Tuesday 5 January, 10:00 am',
      locale: 'en',
      copy: en.dialog,
      signal: undefined,
      mount: (request) => {
        requests.push(request);
        let unmount: () => void = () => undefined;
        act(() => {
          unmount = mountDialog(request);
        });
        return () => {
          act(() => unmount());
        };
      },
    });
    expect(
      await screen.findByRole('dialog', { name: en.dialog.title }),
    ).toBeInTheDocument();
    await act(async () => {
      requests[0]?.dismiss();
      await Promise.resolve();
    });
    await expect(opened).resolves.toEqual({
      ok: true,
      result: { status: 'declined' },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
