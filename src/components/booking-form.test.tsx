import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingForm } from '@/components/booking-form';
import { BOOKING_RULES } from '@/content/booking-rules';
import { bookPage as en } from '@/content/en/book';
import { bookPage as es } from '@/content/es/book';
import { candidateSlots } from '@/lib/slots';

const state = vi.hoisted(() => ({ hydrated: true }));
const submitBooking = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
const attribution = vi.hoisted(() => vi.fn());
const fetchAvailability = vi.hoisted(() => vi.fn());
const ATTRIBUTION = {
  landing: '/book?utm_source=news',
  referrer: '',
  page: '/book',
};

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
  useHydrated: () => state.hydrated,
}));
vi.mock('@/lib/booking-client', () => ({ submitBooking, fetchAvailability }));
vi.mock('@/lib/lead-client', () => ({ attribution }));
vi.mock('@/lib/track', () => ({ track }));
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (token: string) => void;
    onError: () => void;
  }) => (
    <>
      <button type="button" onClick={() => onSuccess('tok_1')}>
        solve challenge
      </button>
      <button type="button" onClick={onError}>
        break challenge
      </button>
    </>
  ),
}));

const FROM = Date.UTC(2027, 0, 12, 0);
const SLOTS = candidateSlots(BOOKING_RULES, FROM, FROM + 2 * 86_400_000);
const SLOT = SLOTS.find((slot) => slot.start === Date.UTC(2027, 0, 12, 9));
const ISO = '2027-01-12T09:00:00.000Z';

function renderForm(locale: 'en' | 'es' = 'en') {
  return render(
    <BookingForm
      copy={locale === 'en' ? en : es}
      locale={locale}
      zone="Asia/Singapore"
      slots={SLOTS}
    />,
  );
}

async function pick(user: ReturnType<typeof userEvent.setup>, time: string) {
  const [first] = screen.getAllByRole('radio', { name: time });
  if (!first) throw new Error(`no slot at ${time}`);
  await user.click(first);
}

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await pick(user, '5:00 pm');
  await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
  await user.type(
    screen.getByLabelText('Email (the invitation goes here)'),
    'ada@example.com',
  );
  await user.type(
    screen.getByLabelText('What would you like to talk about?'),
    'Automate our inbox triage.',
  );
  await user.click(screen.getByRole('checkbox'));
  await user.click(await screen.findByText('solve challenge'));
}

beforeEach(() => {
  state.hydrated = true;
  submitBooking.mockReset();
  track.mockReset();
  attribution.mockReset();
  fetchAvailability.mockReset();
  fetchAvailability.mockResolvedValue({ status: 'unavailable' });
  attribution.mockResolvedValue(ATTRIBUTION);
});

describe('BookingForm', () => {
  it('has a slot picker, labelled fields and the zone in the legend', () => {
    renderForm();
    expect(SLOT).toBeDefined();
    expect(screen.getByText('Times in Singapore')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeRequired();
    expect(
      screen.getByLabelText('Email (the invitation goes here)'),
    ).toHaveAttribute('type', 'email');
    expect(
      screen.getByLabelText('What would you like to talk about?'),
    ).toHaveAttribute('minlength', '10');
    expect(
      screen.getByRole('link', { name: 'privacy policy' }),
    ).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('checkbox').closest('label')).toHaveTextContent(
      'including a Google Calendar event with my email address',
    );
  });

  it('disables everything until hydrated, and the submit until Turnstile is solved', async () => {
    state.hydrated = false;
    const { unmount } = renderForm();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    unmount();
    state.hydrated = true;
    const user = userEvent.setup();
    renderForm();
    const submit = screen.getByRole('button', { name: 'Book this time' });
    expect(submit).toBeDisabled();
    expect(screen.queryByText('solve challenge')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Name'));
    await user.click(await screen.findByText('solve challenge'));
    expect(submit).toBeEnabled();
  });

  it('posts the full payload with consent, zone, locale and attribution', async () => {
    submitBooking.mockResolvedValue({ kind: 'rejected', reason: 'limit' });
    const user = userEvent.setup();
    renderForm();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Book this time' }));
    await waitFor(() => expect(submitBooking).toHaveBeenCalledTimes(1));
    expect(submitBooking).toHaveBeenCalledWith({
      slot: ISO,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: undefined,
      topic: 'Automate our inbox triage.',
      timeZone: 'Asia/Singapore',
      locale: 'en',
      consent: true,
      turnstileToken: 'tok_1',
      website: '',
      attribution: ATTRIBUTION,
    });
  });

  it('shows the success panel, focuses its heading and tracks both events once', async () => {
    submitBooking.mockResolvedValue({
      kind: 'booked',
      start: Date.parse(ISO),
      end: Date.parse(ISO) + 1_800_000,
      meetUrl: 'https://meet.google.com/abc',
    });
    const user = userEvent.setup();
    renderForm();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Book this time' }));
    const heading = await screen.findByRole('heading', {
      name: "You're booked",
    });
    expect(heading).toHaveFocus();
    expect(
      screen.getByText(
        'Your call is on Tuesday 12 January, 5:00 pm (Singapore).',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/ada@example.com/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Join with Google Meet' }),
    ).toHaveAttribute('href', 'https://meet.google.com/abc');
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenCalledWith('book_meeting');
    expect(track).toHaveBeenCalledWith('generate_lead', { method: 'booking' });
  });

  it('says the link is in the invitation when Google gave none, and writes Spanish', async () => {
    submitBooking.mockResolvedValue({
      kind: 'booked',
      start: Date.parse(ISO),
      end: Date.parse(ISO) + 1_800_000,
      meetUrl: null,
    });
    const user = userEvent.setup();
    renderForm('es');
    await pick(user, '17:00');
    await user.type(screen.getByLabelText('Nombre'), 'Ada');
    await user.type(
      screen.getByLabelText('Correo electrónico (aquí llega la invitación)'),
      'ada@example.com',
    );
    await user.type(
      screen.getByLabelText('¿De qué te gustaría hablar?'),
      'Automatizar nuestro correo.',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(await screen.findByText('solve challenge'));
    await user.click(
      screen.getByRole('button', { name: 'Reservar esta hora' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Reserva confirmada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'El enlace de Google Meet llega con la invitación del calendario. Si no lo ves, te lo enviaremos antes de la llamada.',
      ),
    ).toBeInTheDocument();
  });

  it('refreshes the list after slot_taken in one request and keeps what was typed', async () => {
    submitBooking.mockResolvedValue({ kind: 'rejected', reason: 'slot_taken' });
    fetchAvailability.mockResolvedValue({
      status: 'ok',
      slots: SLOTS.slice(1),
    });
    const user = userEvent.setup();
    renderForm();
    const before = screen.getAllByRole('radio', { hidden: true }).length;
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Book this time' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Someone just took that time.');
    expect(alert).not.toHaveTextContent('hello@zenetlabs.com');
    expect(alert).toHaveFocus();
    await waitFor(() =>
      expect(screen.getAllByRole('radio', { hidden: true })).toHaveLength(
        before - 1,
      ),
    );
    expect(fetchAvailability).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
    expect(track).not.toHaveBeenCalled();
  });

  it('keeps the form, the list and the typed details when the refresh fails', async () => {
    submitBooking.mockResolvedValue({ kind: 'rejected', reason: 'slot_taken' });
    fetchAvailability.mockResolvedValue({ status: 'unavailable' });
    const user = userEvent.setup();
    renderForm();
    const before = screen.getAllByRole('radio', { hidden: true }).length;
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Book this time' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(fetchAvailability).toHaveBeenCalled());
    expect(screen.getAllByRole('radio', { hidden: true })).toHaveLength(before);
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
    expect(
      screen.getByLabelText('What would you like to talk about?'),
    ).toHaveValue('Automate our inbox triage.');
  });

  it('says the day is full, and refreshes, when the day filled up', async () => {
    submitBooking.mockResolvedValue({ kind: 'rejected', reason: 'day_full' });
    fetchAvailability.mockResolvedValue({ status: 'ok', slots: SLOTS });
    const user = userEvent.setup();
    renderForm();
    await fillIn(user);
    await user.click(screen.getByRole('button', { name: 'Book this time' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That day is now fully booked.',
    );
    await waitFor(() => expect(fetchAvailability).toHaveBeenCalledTimes(1));
  });

  it.each([
    [
      { kind: 'rejected', reason: 'invalid_slot' },
      'Someone just took that time.',
      false,
    ],
    [
      { kind: 'rejected', reason: 'limit' },
      'We could not book this time for that address.',
      true,
    ],
    [{ kind: 'failed', error: 'captcha' }, 'The security check failed.', true],
    [
      { kind: 'failed', error: 'rate' },
      'Too many attempts from your connection.',
      true,
    ],
    [
      { kind: 'failed', error: 'unavailable' },
      'We could not confirm the booking.',
      true,
    ],
    [
      { kind: 'failed', error: 'invalid' },
      'We could not confirm the booking.',
      true,
    ],
  ])(
    'maps %j to its alert (mailto fallback: %s)',
    async (outcome, text, mailto) => {
      submitBooking.mockResolvedValue(outcome);
      const user = userEvent.setup();
      renderForm();
      await fillIn(user);
      await user.click(screen.getByRole('button', { name: 'Book this time' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text);
      expect(
        screen.queryAllByRole('link', { name: 'hello@zenetlabs.com' }),
      ).toHaveLength(mailto ? 1 : 0);
      expect(
        screen.getByRole('button', { name: 'Book this time' }),
      ).toBeDisabled();
    },
  );

  it('turns a Turnstile error into the captcha alert', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByLabelText('Name'));
    await user.click(await screen.findByText('break challenge'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The security check failed.',
    );
  });
});
