import type { ProjectType } from '@/lib/calculator-answers';

export type LeadMethod =
  | 'form'
  | 'chat'
  | 'voice'
  | 'calculator'
  | 'booking'
  | 'webmcp';

export type CtaId =
  | 'header'
  | 'header_menu'
  | 'hero'
  | 'hero_pricing'
  | 'page_hero'
  | 'page_cta'
  | 'pricing'
  | 'about'
  | 'cases'
  | 'services'
  | 'contact_book'
  | 'start_here'
  | 'sticky'
  | 'desk_slot'
  | 'desk_times'
  | 'desk_contact'
  | 'close_contact'
  | 'close_ask'
  | 'close_call'
  | 'desk_call';

// Where a chat was opened from: the floating launcher, the home desk, or the
// Ask door in the home close.
export type ChatEntry = 'launcher' | 'desk' | 'close';

type ParamEvents = {
  generate_lead: { method: LeadMethod };
  cta_click: { cta_id: CtaId };
  calculator_complete: { project_type: ProjectType };
  chat_open: { entry: ChatEntry };
};
type PlainEvent =
  | 'book_request'
  | 'book_meeting'
  | 'chat_message'
  | 'voice_call_start'
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
  (
    command: 'config',
    id: string,
    params: { cookie_expires: number; send_page_view: false },
  ): void;
  (
    command: 'set',
    params: {
      page_location: string;
      page_referrer: string;
      page_title: string;
    },
  ): void;
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

// The click on Confirm in the emailed link: a native form post leaves the page
// at once, so both conversions go with beacon transport. The method is the
// channel the request came from.
export function trackBookingConfirm(method: LeadMethod): void {
  if (__GA4_ID__ === null || !window.zenetTracking) return;
  window.gtag?.('event', 'book_meeting', { transport_type: 'beacon' });
  window.gtag?.('event', 'generate_lead', { method, transport_type: 'beacon' });
}
