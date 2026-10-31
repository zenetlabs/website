import { serviceBodies } from '@/lib/llms';

export const SERVICE_BODIES = {
  en: await serviceBodies('en'),
  es: await serviceBodies('es'),
};
