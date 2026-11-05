import type { ConsentCopy } from '@/content/types';

// TODO(albert): review the banner and settings copy
export const consent: ConsentCopy = {
  title: 'Cookies en Zenet Labs',
  text: 'Con tu permiso usamos cookies de Google Analytics para contar las visitas y los botones que se usan, y recordamos cómo nos conociste. No guardamos nada opcional hasta que elijas.',
  textShort:
    'Con tu permiso usamos cookies de Google Analytics y recordamos cómo nos conociste. No guardamos nada opcional hasta que elijas.',
  more: 'Más información',
  less: 'Menos información',
  policy: 'Política de cookies',
  reject: 'Rechazar todo',
  accept: 'Aceptar todo',
  settings: 'Configurar',
  dialog: {
    title: 'Configuración de cookies',
    intro:
      'Elige qué podemos guardar en tu navegador. Puedes cambiarlo cuando quieras desde «Configuración de cookies», al pie de cada página.',
    necessary: 'Estrictamente necesarias',
    necessaryText: 'Recuerdan esta elección en tu navegador durante 12 meses.',
    alwaysOn: 'Siempre activas',
    analytics: 'Analíticas',
    analyticsText:
      'Google Analytics cuenta las visitas y los botones que se usan, con cookies que duran hasta 13 meses. Las señales publicitarias están desactivadas.',
    attribution: 'Atribución',
    attributionText:
      'Recuerda durante 90 días cómo nos conociste (página de llegada, sitio que te enlazó y etiquetas de campaña como utm_source o gclid) y lo envía con tu consulta. Se queda con nosotros: Google no lo recibe y todas las señales publicitarias siguen desactivadas.',
    save: 'Guardar selección',
    close: 'Cerrar',
  },
};
