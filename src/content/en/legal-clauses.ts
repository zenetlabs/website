// TODO(albert): counsel sign-off of the 2026-11-05 draft
import type { SpanishLegalClauses } from '@/content/types';

// Spanish legal clauses for the Singapore company, used on the es pages only
// while the Spanish entity has no address; templates take {legalName}, {taxId}, {address}.
export const legalClauses = {
  controller:
    'El responsable del tratamiento de los datos personales que se recogen a través de zenetlabs.com es {legalName} ({taxId}), con domicilio social en {address}, que opera con el nombre comercial Zenet Labs.',
  dataProtectionOfficer:
    'Según la ley de protección de datos personales de Singapur (PDPA), hemos designado como responsable de protección de datos (Data Protection Officer) a Dan Lu, con quien puedes contactar en privacy@zenetlabs.com.',
  holder:
    'El titular de este sitio web es {legalName}, sociedad constituida en Singapur que opera con el nombre comercial Zenet Labs, inscrita en la ACRA (Accounting and Corporate Regulatory Authority) con el número {taxId} y domicilio social en {address}.',
  formAcknowledgement:
    'La casilla del formulario confirma que has leído esta política y, según la ley de protección de datos personales de Singapur (PDPA), es tu consentimiento para este uso.',
  processors:
    'Usamos estos encargados del tratamiento, con contratos conforme al art. 28 del RGPD:',
  transferPlaces: 'por ejemplo en Estados Unidos y Singapur',
  recordsRetention:
    'durante los plazos que exige la normativa de Singapur (cinco años para los registros contables y fiscales)',
  authorities:
    'la Agencia Española de Protección de Datos (AEPD), C/ Jorge Juan, 6, 28001 Madrid (www.aepd.es), o la autoridad de protección de datos del país de la UE en el que residas o trabajes, o la Personal Data Protection Commission (PDPC) de Singapur.',
  governingLaw:
    'Este aviso legal se rige por la legislación de Singapur, sin perjuicio de las normas imperativas que te protejan, en particular la LSSI y la normativa de protección de los consumidores de tu país de residencia, cuyos juzgados y tribunales podrás elegir si eres consumidor.',
} satisfies SpanishLegalClauses;
