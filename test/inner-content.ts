import { deskClose as enDesk } from '@/content/en/desk';
import { serviceIncludes as enIncludes } from '@/content/en/service-includes';
import { deskClose as esDesk } from '@/content/es/desk';
import { serviceIncludes as esIncludes } from '@/content/es/service-includes';
import type { DeskCloseCopy, ServiceId } from '@/content/types';
import type { Locale } from '@/lib/i18n';

export const INCLUDES: Record<Locale, Record<ServiceId, readonly string[]>> = {
  en: enIncludes,
  es: esIncludes,
};

export const DESK_CLOSE: Record<Locale, DeskCloseCopy> = {
  en: enDesk,
  es: esDesk,
};
