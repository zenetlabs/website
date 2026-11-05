// TODO(albert): counsel sign-off of the 2026-11-05 draft
import type { SpanishLegalClauses } from '@/content/types';

// Spanish legal clauses for the sole trader; templates take {legalName}, {taxId}, {address}.
export const legalClauses = {
  controller:
    'El responsable del tratamiento de los datos personales que se recogen a través de las páginas en español de zenetlabs.com (las que empiezan por zenetlabs.com/es) es {legalName}, profesional autónomo con {taxId} y domicilio en {address}, que opera con el nombre comercial Zenet Labs.',
  dataProtectionOfficer:
    'No hemos designado un delegado de protección de datos porque nuestra actividad no lo exige (art. 37 del RGPD y art. 34 de la LOPDGDD).',
  holder:
    'El titular de este sitio web es {legalName}, profesional autónomo que opera con el nombre comercial Zenet Labs, con {taxId} y domicilio en {address}. Como empresario individual, no está inscrito en el Registro Mercantil, y su actividad no requiere autorización administrativa previa ni la colegiación en un colegio profesional.',
  formAcknowledgement:
    'La casilla del formulario solo confirma que has leído esta política; no es una base jurídica adicional del tratamiento.',
  processors:
    'El titular contrata directamente como encargados del tratamiento a los proveedores siguientes, con contratos conforme al art. 28 del RGPD, y los datos de estas páginas no se comunican a la sociedad que opera las páginas en inglés:',
  transferPlaces: 'por ejemplo en Estados Unidos',
  recordsRetention:
    'durante los plazos que exige la normativa mercantil y tributaria española (seis años para los libros y justificantes contables, según el art. 30 del Código de Comercio)',
  authorities:
    'la Agencia Española de Protección de Datos (AEPD), C/ Jorge Juan, 6, 28001 Madrid (www.aepd.es), o la autoridad de protección de datos del país de la UE en el que residas o trabajes.',
  governingLaw:
    'Este aviso legal y el uso del sitio se rigen por la legislación española. Para cualquier controversia son competentes los juzgados y tribunales de Barcelona, salvo que seas consumidor: en ese caso puedes acudir a los de tu domicilio.',
} satisfies SpanishLegalClauses;
