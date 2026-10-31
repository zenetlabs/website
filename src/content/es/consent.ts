import type { ConsentCopy } from '@/content/types';

// TODO(albert): review the banner and settings copy
export const consent: ConsentCopy = {
  title: 'Cookies en Zenet Labs',
  text: 'Con tu permiso usamos cookies de Google Analytics para ver cómo se usa la web y recordamos cómo nos conociste. No guardamos nada opcional hasta que elijas.',
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
      'Google Analytics cuenta las visitas y los botones que se usan, con cookies que duran hasta 13 meses.',
    marketing: 'Marketing',
    marketingText:
      'Recuerdan durante 90 días cómo nos conociste (página de llegada, sitio que te enlazó y etiquetas de campaña como utm_source o gclid) y lo envían con tu consulta. También permiten a Google usar los datos analíticos para medir publicidad; hoy no usamos etiquetas publicitarias.',
    save: 'Guardar selección',
    close: 'Cerrar',
  },
};
