import type { DeskCopy } from '@/content/types';

// The booking copy of the desk: shared by the home page and the contact page.
export const slotsCopy = {
  title: 'Book a 30-minute call',
  meta: '30 minutes on Google Meet',
  group: 'Next free times',
  timesIn: 'Times in {zone}',
  seeAll: 'See all times',
  seeAvailable: 'See available times',
  unavailable:
    "Online booking isn't available right now. Send us a message instead and we will suggest a time.",
  message: 'Send a message',
} satisfies DeskCopy['slots'];
