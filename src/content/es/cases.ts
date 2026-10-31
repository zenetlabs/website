import { viatsyCaseName } from '@/content/es/case-name';
import type { CaseStudy } from '@/content/types';

export const viatsy = {
  id: 'viatsy',
  name: 'Viatsy',
  tag: 'Viajes · Grupos reducidos a Asia',
  context:
    'Viatsy organiza viajes en grupo reducido a Japón, China, Corea, Taiwán y Hong Kong. Cada viaje supone consultas por varios canales, una propuesta a medida y muchas reservas con proveedores.',
  // TODO(albert): confirm
  automated: [
    'Un primer borrador de respuesta para cada consulta, que una persona revisa y envía',
    'Propuestas redactadas a partir de lo que pide el cliente y del catálogo de viajes',
    'Las confirmaciones de proveedores se pasan a la reserva y con ellas se monta la documentación del viaje',
    'Solicitudes de pago y recordatorios enviados a su debido tiempo',
  ],
  metrics: [
    // TODO(albert): [X]
    {
      id: 'admin-hours',
      label: 'Horas de gestión ahorradas por semana',
      value: null,
      unit: ' h',
    },
    // TODO(albert): [X]
    {
      id: 'first-reply',
      label: 'Tiempo hasta la primera respuesta',
      value: null,
      unit: ' min',
    },
  ],
  link: { page: 'viatsyCase', label: viatsyCaseName },
} satisfies CaseStudy;

export const taplany = {
  id: 'taplany',
  name: 'Taplany',
  tag: 'SaaS · Software para agencias de viajes',
  context:
    'Taplany es la plataforma que creamos a partir de las automatizaciones de Viatsy para que otras agencias de viajes puedan usarlas: web, consultas, propuestas, reservas, pagos y WhatsApp en un mismo sitio.',
  // TODO(albert): confirm
  automated: [
    'Respuestas a consultas redactadas con el tono de la agencia, para que una persona las apruebe',
    'Itinerarios y confirmaciones de proveedores pegados como texto, convertidos en reservas estructuradas',
    'WhatsApp, correo y enlaces de pago en la misma línea de tiempo que cada reserva',
    'Contenidos de la web redactados y verificados antes de publicarse',
  ],
  metrics: [
    // TODO(albert): [X]
    {
      id: 'agencies',
      label: 'Agencias que lo usan',
      value: null,
      unit: '',
    },
    // TODO(albert): [X]
    {
      id: 'proposals',
      label: 'Propuestas creadas al mes',
      value: null,
      unit: '',
    },
  ],
} satisfies CaseStudy;

export const cases = [viatsy, taplany] satisfies readonly CaseStudy[];
