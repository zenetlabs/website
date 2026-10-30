import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from '@/components/contact-form';

const state = vi.hoisted(() => ({ hydrated: true }));
const sendContact = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
  useHydrated: () => state.hydrated,
}));

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => fn,
}));

vi.mock('@/server/contact.functions', () => ({ sendContact }));

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
  sendContact.mockReset();
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
    sendContact.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByLabelText('Name'));
    await fillIn(user);
    await user.click(screen.getByText('solve challenge'));
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(screen.getByText('Message sent')).toBeInTheDocument(),
    );
    expect(sendContact).toHaveBeenCalledWith({
      data: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        company: undefined,
        message: 'Automate our inbox triage please.',
        consent: true,
        turnstileToken: 'tok_1',
        website: '',
        locale: 'en',
      },
    });
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.getByText('Message sent')).toHaveFocus();
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
    ['a send failure', { ok: false, error: 'send' }],
    ['a captcha failure', { ok: false, error: 'captcha' }],
  ])(
    'shows the alert with the mailto fallback on %s',
    async (_label, result) => {
      sendContact.mockResolvedValueOnce(result);
      const user = userEvent.setup();
      render(<ContactForm />);
      await user.click(screen.getByLabelText('Name'));
      await fillIn(user);
      await user.click(screen.getByText('solve challenge'));
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Please try again');
      expect(alert).toHaveFocus();
      expect(
        screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
      ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).toBeDisabled();
    },
  );

  it('shows the alert when the server function throws', async () => {
    sendContact.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByLabelText('Name'));
    await fillIn(user);
    fireEvent.click(screen.getByText('solve challenge'));
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
