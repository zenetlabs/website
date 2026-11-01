import { z } from 'zod';
import {
  localeField,
  pageField,
  timeZoneField,
  turnstileTokenField,
} from '@/server/request-fields';

export const voiceSessionRequest = z.object({
  locale: localeField,
  page: pageField,
  timeZone: timeZoneField,
  turnstileToken: turnstileTokenField,
});
