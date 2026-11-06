// The assistant's opening, shared by the home desk (rendered on the server) and
// the chat panel, so both say exactly the same thing.
export const assistantIntro = {
  title: 'Zenet Labs assistant',
  badge: 'AI',
  welcome: 'Hi! Ask me about our services, prices or how a project works.',
  welcomeBooking: ' I can also find you a time for a 30-minute call.',
  suggestions: [
    'How much does an AI agent cost?',
    'What does the automation diagnostic include?',
  ],
  inputLabel: 'Your message',
  placeholder: 'Type your question',
  send: 'Send',
} as const;
