import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from '@/components/contact-form';

const state = vi.hoisted(() => ({ hydrated: true }));
const submitLead = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
const attribution = vi.hoisted(() => vi.fn());
const ATTRIBUTION = {
  landing: '/?utm_source=news',
  referrer: 'https://example.org/',
  page: '/',
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

vi.mock('@/lib/lead-client', () => ({
  submitLead,
  attribution,
}));

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

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(
    screen.getByLabelText('What should we look at?'),
    'Automate our inbox triage please.',
  );
  await user.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  state.hydrated = true;
  submitLead.mockReset();
  track.mockReset();
  attribution.mockReset();
  attribution.mockResolvedValue(ATTRIBUTION);
});

describe('ContactForm', () => {
  it('labels every field and mirrors the schema constraints', () => {
    render(<ContactForm />);
    const name = screen.getByLabelText('Name');
    const email = screen.getByLabelText('Email');
    const message = screen.getByLabelText('What should we look at?');
    expect(name).toBeRequired();
    expect(name).toHaveAttribute('maxlength', '100');
    expect(email).toBeRequired();
    expect(email).toHaveAttribute('type', 'email');
    expect(message).toBeRequired();
    expect(message).toHaveAttribute('minlength', '10');
    expect(screen.getByLabelText('Company (optional)')).not.toBeRequired();
    expect(screen.getByRole('checkbox')).toBeRequired();
    expect(
      screen.getByRole('link', { name: 'privacy policy' }),
    ).toHaveAttribute('href', '/privacy');
  });

  it('names the legal entity in the consent label', () => {
    render(<ContactForm />);
    expect(screen.getByRole('checkbox').closest('label')).toHaveTextContent(
      'I agree that Zenet Technology Pte. Ltd. uses these details to reply to my enquiry, as described in the privacy policy.',
    );
  });

  it('keeps the honeypot out of the tab order and the accessibility tree', () => {
    const { container } = render(<ContactForm />);
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot).toHaveAttribute('autocomplete', 'off');
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('disables the fields until hydrated', () => {
    state.hydrated = false;
    render(<ContactForm />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('mounts Turnstile only after focus and enables submit once solved', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const submit = screen.getByRole('button', { name: 'Send message' });
    expect(screen.queryByText('solve challenge')).not.toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.click(screen.getByLabelText('Name'));
    await user.click(screen.getByText('solve challenge'));
    expect(submit).toBeEnabled();
  });

  it('submits the payload and shows the confirmation', async () => {
    submitLead.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByLabelText('Name'));
    await fillIn(user);
    await user.click(screen.getByText('solve challenge'));
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(screen.getByText('Message sent')).toBeInTheDocument(),
    );
    expect(submitLead).toHaveBeenCalledWith({
      source: 'form',
      locale: 'en',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: undefined,
      message: 'Automate our inbox triage please.',
      consent: true,
      turnstileToken: 'tok_1',
      website: '',
      attribution: ATTRIBUTION,
    });
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.getByText('Message sent')).toHaveFocus();
    expect(track).toHaveBeenCalledWith('generate_lead', { method: 'form' });
  });

  it('starts from a prefilled message and counts the lead for its method', async () => {
    submitLead.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    const message = 'Calculator estimate\n- Project: S$8,500–13,500\n\n';
    render(<ContactForm prefill={{ message, method: 'calculator' }} />);
    const field = screen.getByLabelText('What should we look at?');
    expect(field).toHaveValue(message);

    await user.click(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(field, 'We ship on Fridays.');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('solve challenge'));
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(screen.getByText('Message sent')).toBeInTheDocument(),
    );
    expect(submitLead).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'form',
        message: expect.stringContaining('Project: S$8,500–13,500'),
      }),
    );
    expect(track).toHaveBeenCalledWith('generate_lead', {
      method: 'calculator',
    });
  });

  it('shows the captcha alert with the mailto fallback when the widget errors', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByLabelText('Name'));
    await user.click(screen.getByText('break challenge'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The security check failed',
    );
    expect(
      screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
    ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
  });

  it.each([
    ['captcha', 'The security check failed'],
    ['rate', 'Too many attempts'],
    ['invalid', 'We could not send your message'],
    ['unavailable', 'We could not send your message'],
    ['origin', 'We could not send your message'],
  ])(
    'maps the %s error to its alert with the mailto fallback',
    async (error, text) => {
      submitLead.mockResolvedValueOnce({ ok: false, error });
      const user = userEvent.setup();
      render(<ContactForm />);
      await user.click(screen.getByLabelText('Name'));
      await fillIn(user);
      await user.click(screen.getByText('solve challenge'));
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text);
      expect(alert).toHaveFocus();
      expect(track).not.toHaveBeenCalled();
      expect(
        screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
      ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).toBeDisabled();
    },
  );
});

describe('ContactForm when attribution fails', () => {
  it('never stays pending: it shows the send error with the mailto fallback', async () => {
    attribution.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByLabelText('Name'));
    await fillIn(user);
    await user.click(screen.getByText('solve challenge'));
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not send your message',
    );
    expect(submitLead).not.toHaveBeenCalled();
  });
});
