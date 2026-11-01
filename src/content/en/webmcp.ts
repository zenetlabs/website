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
      'Opens a confirmation dialog on this page. Nothing is booked until the visitor confirms there, and the result says what happened. The visitor enters their own name, email and company in that dialog, so pass only the slot (returned by check_availability) and the topic.',
    navigate:
      'Opens a page of this site in the current tab, or scrolls to a section of the home page.',
  },
  dialog: {
    title: 'Confirm your call',
    intro:
      'An AI agent in your browser asked to book this call for you. Check the details: nothing is booked until you confirm.',
    when: 'When',
    confirm: 'Confirm booking',
    confirming: 'Booking…',
    cancel: 'Cancel',
    close: 'Close',
    success: {
      title: "You're booked",
      text: "We've sent a Google Calendar invitation and a confirmation to {email}.",
      meet: 'Open the Google Meet link',
      meetLater: 'The Google Meet link is in the invitation.',
    },
    errors: {
      captcha: 'The security check failed. Please try again, or write to',
      rate: 'Too many attempts from your connection. Wait a minute and try again, or write to',
      taken:
        'That time is no longer available. Ask your agent for another, or write to',
      error:
        'We could not book the call. Check the details and try again, or write to',
    },
  },
};
