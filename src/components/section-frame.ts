export type SectionVariant = 'default' | 'tint' | 'band' | 'compact' | 'notice';

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
    bg: 'bg-human-soft',
    pad: 'py-section-compact',
  },
};

export function sectionFrame(variant: SectionVariant) {
  return VARIANTS[variant];
}
