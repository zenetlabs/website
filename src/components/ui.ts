const BUTTON =
  'inline-flex items-center justify-center rounded-input font-semibold transition-[background-color,border-color] duration-(--duration-press) ease-out motion-safe:transition-[background-color,border-color,scale] motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50';

const FILLED = 'bg-cta text-cta-fg hover:bg-cta-hover';

const OUTLINED = 'border border-fg text-fg hover:bg-surface';

export const PRIMARY_BUTTON = `${BUTTON} ${FILLED} min-h-11 px-5 py-2 text-ui-m`;

export const PRIMARY_BUTTON_LG = `${BUTTON} ${FILLED} min-h-12 w-full px-6 py-2 text-ui-l sm:w-auto`;

export const SECONDARY_BUTTON = `${BUTTON} ${OUTLINED} min-h-11 px-5 py-2 text-ui-m`;

export const SECONDARY_BUTTON_SM = `${BUTTON} ${OUTLINED} min-h-11 px-4 py-2 text-ui-s`;

export const EYEBROW =
  'font-mono text-label font-medium uppercase text-muted-fg';

export const PILL = 'w-fit rounded-full px-3 py-0.5';

export const LEAD = 'max-w-[60ch] text-lead text-fg-soft';

export const TEXT_LINK =
  'text-link underline underline-offset-4 motion-safe:transition-[text-underline-offset] motion-safe:duration-(--duration-hover) motion-safe:ease-out hover:underline-offset-2';

export const PROSE = 'max-w-[60ch] text-fg-soft';

export const H3 = 'font-display text-h3';

export const CARD = 'rounded-card border border-hairline bg-surface';

export const CALLOUT_CARD = `${CARD} max-w-[calc(60ch+4rem)] p-8`;

export const BULLET_ITEM =
  'relative pl-5 before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-agent';
