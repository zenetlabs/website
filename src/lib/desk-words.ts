import type { DeskCopy } from '@/content/types';

// While the assistant is dark the desk says who really answers: a person, by
// email. Only a live assistant offers to find a time.
export function deskWords(copy: DeskCopy, booking: boolean) {
  const { intro, human } = copy;
  return __ASSISTANT__
    ? {
        title: intro.title,
        welcome: booking ? intro.welcome + intro.welcomeBooking : intro.welcome,
        label: copy.label,
        placeholder: intro.placeholder,
      }
    : human;
}
