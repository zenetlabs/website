import type { SpanishLegalClauses } from '@/content/types';

// TODO(albert): review (Spanish legal clauses for the Singapore company; templates take {legalName}, {taxId}, {address})
export const legalClauses = {
  controller:
    'El responsable de los datos personales recogidos a través de zenetlabs.com es {legalName} ({taxId}), {address}. Operamos bajo el nombre Zenet Labs.',
  holder:
    'El titular de este sitio web es {legalName}, sociedad constituida en Singapur que opera con el nombre comercial Zenet Labs, inscrita en la ACRA (Accounting and Corporate Regulatory Authority) con el número {taxId} y domicilio social en {address}.',
  consentBasis:
    'Tu consentimiento, que das al marcar la casilla del formulario (art. 6.1.a del RGPD y la ley de protección de datos personales de Singapur, PDPA).',
  transferPlaces: 'por ejemplo en Estados Unidos y Singapur',
  authorities:
    'la Agencia Española de Protección de Datos (AEPD) o la autoridad de protección de datos de tu país de residencia en la UE, o la Personal Data Protection Commission (PDPC) de Singapur.',
  // TODO(albert): confirm
  governingLaw:
    'Este aviso legal se rige por la legislación de Singapur, sin perjuicio de las normas imperativas aplicables, en particular la LSSI y la normativa de protección de los consumidores de tu país de residencia.',
} satisfies SpanishLegalClauses;
