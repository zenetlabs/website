import { chatCopy } from '@/content/en/chat';
import type { VoiceCopy } from '@/content/types';

// TODO(albert): review the voice copy
export const voiceCopy = {
  title: 'Talk to the assistant',
  badge: 'AI',
  notice:
    "You're about to talk to an AI voice assistant, not a person. It answers from this site's content and can make mistakes, so check prices on our pricing page. Your voice is processed by ElevenLabs, our voice provider in the United States, to understand you and reply; we don't record audio. ElevenLabs keeps the text of the conversation for 30 days. If you book a call, we keep your name, email and topic with your enquiry for 24 months. During the call the assistant can open pages of this site for you.",
  privacyLink: 'Privacy policy',
  micNote: 'Your browser will ask to use the microphone when you start.',
  start: 'Start call',
  cancel: 'Not now',
  connecting: 'Connecting…',
  listening: 'Listening',
  speaking: 'The assistant is speaking',
  mute: 'Mute microphone',
  unmute: 'Unmute microphone',
  end: 'End call',
  transcript: 'What was said',
  you: 'You',
  assistant: 'Assistant (AI)',
  opened: 'Opened: {label}',
  booked: "Booked for {label}. We've emailed you the invitation.",
  ended: 'Call ended.',
  again: 'Start a new call',
  micDenied:
    "The microphone is blocked. Allow it in your browser's site settings and try again, or use one of the options below.",
  unsupported: "Voice calls don't work in this browser.",
  errorBudget: "The voice assistant has reached today's limit.",
  errorRate: 'Too many attempts. Wait a minute and try again.',
  errorCaptcha: "We couldn't verify your browser. Try again.",
  errorCall: "The call couldn't start or was cut off.",
  fallbackText: 'You can still reach us:',
  fallbackBook: 'Book a 30-minute call',
  fallbackForm: 'Use the contact form',
  close: 'Close',
  pages: chatCopy.pages,
  sections: chatCopy.sections,
} satisfies VoiceCopy;
