import { diagnosticPlan } from '@/content/es/diagnostic-plan';
import type { ServiceId } from '@/content/types';

// What each ladder row includes: the pricing page and the service pages read it from here.
// TODO(albert): confirm every list
export const serviceIncludes = {
  diagnostic: diagnosticPlan,
  integration: [
    'Alcance definido en el diagnóstico',
    'Montado en tus cuentas, para que sea tuyo',
    'Avisos y reintentos cuando algo falla',
    'Documentación y traspaso a tu equipo',
  ],
  agent: [
    'Batería de pruebas con tus casos reales',
    'Aprobación humana en cada acción con consecuencias',
    'Límites de uso y de coste',
    'Monitorización y registro de cada acción',
  ],
  web: [
    'Diseño y desarrollo según tus procesos',
    'Rápida, accesible y preparada para buscadores',
    'Conectada a tus herramientas desde el primer día',
    'Alojamiento configurado en tus cuentas',
  ],
  training: [
    'Talleres sobre tus propios procesos, no sobre ejemplos genéricos',
    'Mentoría: revisiones periódicas de lo que construye el equipo',
    'Una política de uso que el equipo pueda cumplir',
  ],
  maintenance: [
    'Monitorización y avisos de errores',
    'Correcciones y actualizaciones cuando cambian tus herramientas',
    'Revisión mensual de qué mejorar',
  ],
  growth: [
    'SEO técnico y plan de contenidos',
    'Páginas y artículos que responden a preguntas reales de clientes',
    'Mejoras de conversión basadas en lo que hacen las visitas',
  ],
} satisfies Record<ServiceId, readonly string[]>;
