import { describe, expect, it } from 'vitest';
import { replyLanguage } from '@/server/chat/language';

describe('replyLanguage', () => {
  it.each([
    [
      'Hi, do you speak English? How long does an integration take?',
      'es',
      'en',
    ],
    ['How much does an AI agent cost?', 'es', 'en'],
    ['Quiero reservar una llamada el martes por la mañana', 'en', 'es'],
    ['¿Cuánto cuesta el diagnóstico?', 'en', 'es'],
  ] as const)('answers %j on the %s site in %s', (message, site, expected) => {
    expect(replyLanguage(message, site)).toBe(expected);
  });

  it.each([
    ['¿Trabajáis con SAP Business One?', 'es'],
    ['Do you have an office in Tokyo?', 'en'],
    ['SAP?', 'es'],
    ['Holded PrestaShop', 'es'],
    ['Bonjour, parlez-vous français ?', 'en'],
  ] as const)('keeps the site language for %j', (message, site) => {
    expect(replyLanguage(message, site)).toBe(site);
  });
});
