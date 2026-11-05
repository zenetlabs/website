import { bookingPending } from '@/content/en/booking-pending';
import type { WebMcpCopy } from '@/content/types';

// TODO(albert): review the WebMCP tool titles, the agent-facing notes and the confirmation dialog copy
export const webmcpCopy: WebMcpCopy = {
  titles: {
    get_faq: 'Search the FAQ',
    get_pricing: 'Get official prices',
    estimate_project: 'Estimate a project',
    check_availability: 'Check call availability',
    book_meeting: 'Book a 30-minute call',
    navigate: 'Go to a page',
  },
  notes: {
    book_meeting:
      'Opens a confirmation dialog on this page. The visitor enters their own name, email and company there, so pass only the slot (returned by check_availability) and the topic. When they confirm the dialog, the time is held for 30 minutes and they get an email with a link: the call is booked only when they open it and press Confirm. A pending result means exactly that; never tell the visitor the call is booked.',
    navigate:
      'Opens a page of this site in the current tab, or scrolls to a section of the home page.',
  },
  dialog: {
    title: 'Confirm your call',
    intro:
      'An AI agent in your browser asked to book this call for you. Check the details: nothing is booked until you confirm here and then press Confirm in the email we send you.',
    when: 'When',
    confirm: 'Request this time',
    confirming: 'Sending…',
    cancel: 'Cancel',
    close: 'Close',
    pending: bookingPending,
    errors: {
      captcha: 'The security check failed. Please try again, or write to',
      rate: 'Too many attempts from your connection. Wait a minute and try again, or write to',
      taken:
        'That time is no longer available. Ask your agent for another, or write to',
      limit:
        "We can't hold another time for this address right now. If you already asked for one, confirm it from the email; otherwise try again later or write to",
      disposable:
        "Please use a permanent email address. We can't book calls for temporary inboxes.",
      error:
        'We could not send the request. Check the details and try again, or write to',
    },
  },
};
