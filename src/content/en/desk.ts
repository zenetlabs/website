import { assistantIntro } from '@/content/en/assistant-intro';
import { slotsCopy } from '@/content/en/slots';
import type { DeskCloseCopy } from '@/content/types';

// The desk and its doors, as home and the service and landing pages close with them.
export const deskClose = {
  desk: {
    label: 'Ask the assistant',
    intro: assistantIntro,
    human: {
      title: 'Ask us',
      welcome:
        'Ask us anything about your tools and processes. We reply by email, usually within a working day.',
      label: 'Your question for us',
      placeholder: 'Type your question',
    },
    call: {
      button: 'Call',
      label: 'Call the AI agent',
    },
    slots: slotsCopy,
  },
  doors: {
    call: {
      title: 'Call the agent',
      text: 'Our voice assistant is an AI, not a person.',
    },
    write: {
      title: 'Write to us',
      text: 'Use the contact form.',
    },
  },
  human: 'A person on our team replies.',
} satisfies DeskCloseCopy;
