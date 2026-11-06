const BUTTON =
  'inline-flex items-center justify-center gap-2.5 rounded-button font-semibold select-none transition-[background-color,border-color,color] duration-(--duration-press) ease-out motion-safe:transition-[background-color,border-color,color,scale] motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50';

const FILLED = 'bg-cta text-cta-fg pointer-fine:hover:bg-cta-hover';

const OUTLINED =
  'border border-fg text-fg pointer-fine:hover:bg-fg pointer-fine:hover:text-bg';

export const PRIMARY_BUTTON = `${BUTTON} ${FILLED} min-h-13 px-5.5 py-2 text-ui-l`;

// Full width on phones, its own width from `sm`; the same size as PRIMARY_BUTTON.
export const PRIMARY_BUTTON_FULL = `${PRIMARY_BUTTON} w-full sm:w-auto`;

export const SECONDARY_BUTTON = `${BUTTON} ${OUTLINED} min-h-13 px-5.5 py-2 text-ui-l`;

export const SECONDARY_BUTTON_SM = `${BUTTON} ${OUTLINED} min-h-11 px-4 py-2 text-ui-s`;

export const EYEBROW = 'text-ui-s font-semibold text-muted-fg';

export const PILL = 'w-fit rounded-full px-3 py-0.5';

export const TICK_ITEM = 'tick-item';

export const FEATURED_BADGE = `${PILL} inline-block bg-agent-soft text-label font-bold text-agent`;

export const LEAD = 'max-w-[34em] text-lead text-fg-soft';

export const TEXT_LINK =
  'text-link underline motion-safe:transition-[text-underline-offset] motion-safe:duration-(--duration-hover) motion-safe:ease-out pointer-fine:hover:underline-offset-[0.12em]';

export const PROSE = 'max-w-[65ch] text-fg-soft';

export const H3 = 'text-h3';

export const CARD = 'rounded-card border border-hairline bg-surface';

export const BAND_CARD =
  'scope-page rounded-ticket bg-surface p-6 shadow-band md:p-9';

export const CALLOUT_CARD = `${CARD} max-w-[calc(65ch+4rem)] p-8`;

export const BULLET_ITEM =
  'relative pl-5 before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-agent';
