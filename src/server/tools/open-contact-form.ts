import { z } from 'zod';
import { AGENT_MESSAGE_MAX, agentMessage } from '@/lib/contact-draft';
import { locales } from '@/lib/i18n';
import { defineClientTool } from '@/server/tools/types';

// The one validator: the text is normalised (`agentMessage`, which the browser
// surfaces call directly to avoid shipping zod) and must be 1 to 1,500
// characters after it too.
export const openContactFormInput = z.object({
  message: z
    .string()
    .min(1)
    .max(AGENT_MESSAGE_MAX)
    .describe(
      "The message in the visitor's language, without their name, email or phone.",
    )
    .transform((value, ctx) => {
      const message = agentMessage(value);
      if (message === null) {
        ctx.issues.push({
          code: 'custom',
          message: 'Not a message',
          input: value,
        });
        return z.NEVER;
      }
      return message;
    }),
  locale: z.enum(locales).default('en'),
});

export const openContactForm = defineClientTool({
  name: 'open_contact_form',
  description: {
    en: 'Puts a message for Zenet Labs into the contact form, written from what the visitor told you. Nothing is sent: the visitor reviews it, adds their name and email and sends it themselves.',
    es: 'Pone en el formulario de contacto un mensaje para Zenet Labs, escrito a partir de lo que te ha contado el visitante. No se envía nada: el visitante lo revisa, añade su nombre y su email y lo envía él mismo.',
  },
  input: openContactFormInput,
  output: z.object({ url: z.string(), current: z.boolean().optional() }),
  opens: 'contactForm',
});
