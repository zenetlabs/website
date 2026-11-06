export type SectionVariant = 'default' | 'tint' | 'band' | 'compact' | 'notice';

// White by default, the cool `tint` ground for alternating regions, and at most
// one dark band per page (the close). The notice strip sits on the tint ground.
const VARIANTS: Record<
  SectionVariant,
  { ground: string; bg: string; pad: string }
> = {
  default: { ground: 'paper', bg: '', pad: 'py-section' },
  compact: { ground: 'paper', bg: '', pad: 'py-section-compact' },
  tint: { ground: 'tint', bg: 'bg-tint', pad: 'py-section' },
  band: { ground: 'band', bg: 'band', pad: 'py-section-band' },
  notice: {
    ground: 'notice',
    bg: 'bg-tint',
    pad: 'py-section-compact',
  },
};

export function sectionFrame(variant: SectionVariant) {
  return VARIANTS[variant];
}
