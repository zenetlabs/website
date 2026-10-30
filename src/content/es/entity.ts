import type { Country, LegalEntity } from '@/content/types';

export const entity = {
  kind: 'sole-trader',
  legalName: 'Albert Sabaté Martínez',
  taxId: { scheme: 'NIF', value: '47986151D' },
  // TODO(albert): Spanish fiscal address. Setting it moves every es page to this entity (footer, legal pages, form consent, JSON-LD). In the same commit, bump every PAGES lastmod and the `updated` dates of the es legal pages, and update the footer line in scripts/smoke.sh.
  address: null,
  // TODO(albert): review (Spanish legal clauses for the sole trader; templates take {legalName}, {taxId}, {address})
  legalEs: {
    controller:
      'El responsable de los datos personales recogidos a través de zenetlabs.com es {legalName}, profesional autónomo con {taxId} y domicilio en {address}, que opera con el nombre comercial Zenet Labs.',
    holder:
      'El titular de este sitio web es {legalName}, profesional autónomo que opera con el nombre comercial Zenet Labs, con {taxId} y domicilio en {address}.',
    consentBasis:
      'Tu consentimiento, que das al marcar la casilla del formulario (art. 6.1.a del RGPD).',
    transferPlaces: 'por ejemplo en Estados Unidos',
    authorities:
      'la Agencia Española de Protección de Datos (AEPD) o la autoridad de protección de datos de tu país de residencia en la UE.',
    // TODO(albert): confirm
    governingLaw:
      'Este aviso legal se rige por la legislación española. Si eres consumidor, puedes acudir a los juzgados y tribunales de tu domicilio; en los demás casos, a los del domicilio del titular.',
  },
  jsonLd: {
    type: 'ProfessionalService',
    idPath: '/es#business',
    urlPath: '/es',
  },
} satisfies LegalEntity;

export const countryNames = {
  SG: 'Singapur',
  ES: 'España',
} satisfies Record<Country, string>;
