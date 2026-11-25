export const SOLO_SIGNALS: readonly RegExp[] = [
  /personally|personalmente/i,
  /(?<!\d)10\s*(?:to|a|[-–])\s*100(?!\d)/i,
  /small studio|estudio pequeño|small AI consultancy|consultoría de IA pequeña/i,
  /works directly with every|trabaja directamente con cada/i,
];

export function soloHits(label: string, texts: readonly string[]): string[] {
  return SOLO_SIGNALS.flatMap((pattern) =>
    texts
      .filter((text) => pattern.test(text))
      .map((text) => `${label} ${pattern}: ${text.slice(0, 120)}`),
  );
}
