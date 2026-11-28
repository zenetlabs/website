import { describe, expect, it, vi } from 'vitest';
import {
  contactFormAsks,
  keepFocus,
  showContactForm,
  subscribeContactForm,
} from '@/lib/contact-door';

describe('contact door bridge', () => {
  it('counts each request and tells the listeners', () => {
    const listener = vi.fn();
    const stop = subscribeContactForm(listener);
    const before = contactFormAsks();
    showContactForm();
    showContactForm();
    expect(contactFormAsks()).toBe(before + 2);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stops telling a listener that unsubscribed', () => {
    const listener = vi.fn();
    subscribeContactForm(listener)();
    showContactForm();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('keepFocus', () => {
  it('moves focus to the message tab when the opener is hidden', () => {
    document.body.innerHTML =
      '<a id="door-message-tab" href="#x">m</a><button id="o" hidden>o</button>';
    const opener = document.getElementById('o');
    if (!opener) throw new Error('missing opener');
    opener.checkVisibility = () => false;
    keepFocus(opener);
    expect(document.activeElement?.id).toBe('door-message-tab');
  });

  it('leaves focus alone when the opener is still shown', () => {
    document.body.innerHTML =
      '<a id="door-message-tab" href="#x">m</a><button id="o">o</button>';
    const opener = document.getElementById('o');
    if (!opener) throw new Error('missing opener');
    opener.checkVisibility = () => true;
    keepFocus(opener);
    expect(document.activeElement?.id).not.toBe('door-message-tab');
  });
});
