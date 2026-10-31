import type { SpanishLegalClauses } from '@/content/types';

// TODO(albert): review (Spanish legal clauses for the sole trader; templates take {legalName}, {taxId}, {address})
export const legalClauses = {
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
} satisfies SpanishLegalClauses;
