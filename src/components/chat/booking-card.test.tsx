import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingCard } from '@/components/chat/booking-card';
import { chatCopy as en } from '@/content/en/chat';
import { chatCopy as es } from '@/content/es/chat';

const submitBooking = vi.hoisted(() => vi.fn());
const attribution = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
const ATTRIBUTION = {
  landing: '/?utm_source=news',
  referrer: '',
  page: '/pricing',
};
const SESSION = '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
// Tuesday 5 January 2027, 01:00 UTC.
const PROPOSAL = {
  slot: '2027-01-05T01:00:00.000Z',
  topic: 'Automate our inbox triage',
};

vi.mock('@/lib/booking-client', () => ({ submitBooking }));
vi.mock('@/lib/lead-client', () => ({ attribution }));
vi.mock('@/lib/track', () => ({ track }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
}));
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess('tok_book')}>
      solve challenge
    </button>
  ),
}));

function card(
  overrides: Partial<React.ComponentProps<typeof BookingCard>> = {},
) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  render(
    <BookingCard
      proposal={PROPOSAL}
      copy={en.booking}
      locale="en"
      zone="Asia/Tokyo"
      sessionId={SESSION}
      onDone={onDone}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onDone, onCancel };
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(en.booking.name), 'Ada Lovelace');
  await user.type(screen.getByLabelText(en.booking.email), 'ada@example.com');
  await user.click(screen.getByRole('checkbox'));
  await user.click(await screen.findByText('solve challenge'));
}

beforeEach(() => {
  submitBooking.mockReset();
  track.mockReset();
  attribution.mockReset().mockResolvedValue(ATTRIBUTION);
});

describe('BookingCard', () => {
  it('shows the slot in the visitor zone and prefills the topic; the heading takes focus', () => {
    card();
    expect(
      screen.getByRole('form', { name: en.booking.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: en.booking.title }),
    ).toHaveFocus();
    expect(screen.getByText(/Tuesday 5 January, 10:00 am/)).toBeInTheDocument();
    expect(screen.getByLabelText(en.booking.topic)).toHaveValue(PROPOSAL.topic);
  });

  it('requires name, email, topic and consent, like the booking page', () => {
    card();
    expect(screen.getByLabelText(en.booking.name)).toBeRequired();
    expect(screen.getByLabelText(en.booking.email)).toBeRequired();
    expect(screen.getByLabelText(en.booking.topic)).toBeRequired();
    expect(screen.getByLabelText(en.booking.company)).not.toBeRequired();
    expect(screen.getByRole('checkbox')).toBeRequired();
  });

  it('keeps Confirm disabled until the challenge is solved', async () => {
    const user = userEvent.setup();
    card();
    expect(
      screen.getByRole('button', { name: en.booking.confirm }),
    ).toBeDisabled();
    await user.click(screen.getByLabelText(en.booking.name));
    await user.click(await screen.findByText('solve challenge'));
    expect(
      screen.getByRole('button', { name: en.booking.confirm }),
    ).toBeEnabled();
  });

  it('posts the details with the conversation id and the book token, then reports the time', async () => {
    submitBooking.mockResolvedValue({
      kind: 'booked',
      start: Date.parse(PROPOSAL.slot),
      end: Date.parse(PROPOSAL.slot) + 1_800_000,
      meetUrl: null,
    });
    const user = userEvent.setup();
    const { onDone } = card();
    await fill(user);
    await user.click(screen.getByRole('button', { name: en.booking.confirm }));
    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Tuesday 5 January, 10:00 am'),
    );
    expect(submitBooking).toHaveBeenCalledWith({
      slot: PROPOSAL.slot,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: undefined,
      topic: PROPOSAL.topic,
      timeZone: 'Asia/Tokyo',
      locale: 'en',
      consent: true,
      turnstileToken: 'tok_book',
      website: '',
      attribution: ATTRIBUTION,
      chatSessionId: SESSION,
    });
    expect(track).toHaveBeenCalledWith('book_meeting');
    expect(track).toHaveBeenCalledWith('generate_lead', { method: 'chat' });
  });

  it('sends no conversation id when there is none', async () => {
    submitBooking.mockResolvedValue({ kind: 'failed', error: 'unavailable' });
    const user = userEvent.setup();
    card({ sessionId: null });
    await fill(user);
    await user.click(screen.getByRole('button', { name: en.booking.confirm }));
    await waitFor(() => expect(submitBooking).toHaveBeenCalled());
    expect(submitBooking.mock.calls[0]?.[0]).not.toHaveProperty(
      'chatSessionId',
    );
  });

  it.each([
    [{ kind: 'rejected', reason: 'slot_taken' }, en.booking.taken],
    [{ kind: 'rejected', reason: 'day_full' }, en.booking.taken],
    [{ kind: 'rejected', reason: 'limit' }, en.booking.error],
    [{ kind: 'failed', error: 'captcha' }, en.booking.captcha],
    [{ kind: 'failed', error: 'rate' }, en.booking.rate],
    [{ kind: 'failed', error: 'unavailable' }, en.booking.error],
  ])('maps %j to its message and tracks nothing', async (outcome, message) => {
    submitBooking.mockResolvedValue(outcome);
    const user = userEvent.setup();
    const { onDone } = card();
    await fill(user);
    await user.click(screen.getByRole('button', { name: en.booking.confirm }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(onDone).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('cancels from "Not now"', async () => {
    const user = userEvent.setup();
    const { onCancel } = card();
    await user.click(screen.getByRole('button', { name: en.booking.cancel }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('is written in Spanish for the Spanish site', () => {
    card({ copy: es.booking, locale: 'es', zone: 'Europe/Madrid' });
    expect(
      screen.getByRole('heading', { name: es.booking.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/martes 5 de enero, 02:00/)).toBeInTheDocument();
  });
});
