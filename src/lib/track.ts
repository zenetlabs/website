export type LeadMethod = 'form' | 'chat' | 'voice' | 'calculator' | 'booking';

export type CtaId =
  | 'header'
  | 'header_menu'
  | 'hero'
  | 'hero_pricing'
  | 'page_hero'
  | 'page_cta'
  | 'pricing'
  | 'about'
  | 'services';

type ParamEvents = {
  generate_lead: { method: LeadMethod };
  cta_click: { cta_id: CtaId };
};
type PlainEvent =
  | 'book_meeting'
  | 'chat_open'
  | 'chat_message'
  | 'voice_call_start'
  | 'calculator_complete'
  | 'pricing_view'
  | 'language_switch';

type ConsentState = 'granted' | 'denied';
export type ConsentSignals = {
  ad_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: ConsentState;
  analytics_storage: ConsentState;
};

export type Gtag = {
  (
    command: 'consent',
    action: 'default' | 'update',
    signals: ConsentSignals,
  ): void;
  (command: 'js', date: Date): void;
  (command: 'config', id: string, params: { cookie_expires: number }): void;
  (command: 'event', name: string, params?: Record<string, string>): void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    zenetTracking?: boolean;
    [flag: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function track(event: PlainEvent): void;
export function track<E extends keyof ParamEvents>(
  event: E,
  params: ParamEvents[E],
): void;
export function track(event: string, params?: Record<string, string>): void {
  if (__GA4_ID__ === null || !window.zenetTracking) return;
  window.gtag?.('event', event, params);
}
