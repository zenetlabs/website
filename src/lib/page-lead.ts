import type { PageHero } from '@/content/types';

// The hero's one sentence, then the rest of the page's old lead: what the
// agent surfaces (llms, the chat knowledge) read as the page's lead.
export function pageLead(hero: PageHero): string {
  return `${hero.lead} ${hero.intro}`;
}
