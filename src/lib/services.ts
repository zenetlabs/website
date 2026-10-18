export function serviceSummary(item: {
  title: string;
  bullets: Record<string, string>;
}): { name: string; description: string } {
  return {
    name: item.title,
    description: `${Object.values(item.bullets).join('; ')}.`,
  };
}
