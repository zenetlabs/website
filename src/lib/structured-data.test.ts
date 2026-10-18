import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { locales, messages } from '@/lib/i18n';
import { STRUCTURED_DATA } from '@/lib/structured-data';

const ID = z.string().startsWith('https://zenetlabs.com/');

const organizationSchema = z.object({
  '@type': z.literal('Organization'),
  '@id': ID,
  email: z.string(),
  description: z.string(),
  areaServed: z.string().min(1),
  knowsAbout: z.array(z.string().min(1)).min(1),
  makesOffer: z
    .array(
      z.object({
        '@type': z.literal('Offer'),
        itemOffered: z.object({
          '@type': z.literal('Service'),
          name: z.string().min(1),
          description: z.string().min(1),
        }),
      }),
    )
    .length(3),
});

function parsed(locale: (typeof locales)[number]) {
  const [organization, webSite] = STRUCTURED_DATA[locale].map(
    (entry): unknown => JSON.parse(entry.children),
  );
  return {
    organization: organizationSchema.parse(organization),
    webSite: z
      .object({ publisher: z.object({ '@id': z.string() }) })
      .parse(webSite),
    json: STRUCTURED_DATA[locale].map((entry) => entry.children).join(''),
  };
}

describe.each(locales)('structured data (%s)', (locale) => {
  const { organization, webSite, json } = parsed(locale);

  it('links the website to the organization by id', () => {
    expect(webSite.publisher['@id']).toBe(organization['@id']);
  });

  it('describes the organization', () => {
    expect(organization.email).toBe('hello@zenetlabs.com');
    expect(organization.description).toBe(messages[locale].meta.description);
  });

  it('offers the three services from the catalogue', () => {
    expect(organization.makesOffer.map((o) => o.itemOffered.name)).toEqual(
      Object.values(messages[locale].services.items).map((i) => i.title),
    );
  });

  it('claims no social profiles', () => {
    expect(json).not.toContain('sameAs');
  });
});

describe('structured data across locales', () => {
  it('localises the description, offers and topics', () => {
    const en = parsed('en').organization;
    const es = parsed('es').organization;
    expect(en.description).not.toBe(es.description);
    expect(en.knowsAbout).not.toEqual(es.knowsAbout);
    expect(en.makesOffer).not.toEqual(es.makesOffer);
  });
});
