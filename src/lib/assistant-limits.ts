import { HOUR_MS } from '@/lib/time';

export const CHAT_LIMITS = {
  messages: 20,
  messageChars: 1000,
  idleMs: 2 * HOUR_MS,
  absoluteMs: 24 * HOUR_MS,
} as const;
