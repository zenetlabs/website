import { z } from 'zod';
import { isPublished, type SiteFlags } from '@/lib/page-registry';
import { bookMeeting } from '@/server/tools/book-meeting';
import { checkAvailability } from '@/server/tools/check-availability';
import { estimateProject } from '@/server/tools/estimate-project';
import { getFaq } from '@/server/tools/get-faq';
import { getPage } from '@/server/tools/get-page';
import { getPricing } from '@/server/tools/get-pricing';
import { listPages } from '@/server/tools/list-pages';
import { navigate } from '@/server/tools/navigate';
import { openContactForm } from '@/server/tools/open-contact-form';
import { searchSite } from '@/server/tools/search-site';
import type { Tool } from '@/server/tools/types';

// Offered only while the booking flag is on, so a dark feature is not advertised.
const BOOKING_TOOLS = new Set(['check_availability', 'book_meeting']);

export const TOOLS: readonly Tool[] = [
  getFaq,
  getPricing,
  estimateProject,
  checkAvailability,
  bookMeeting,
  navigate,
  listPages,
  getPage,
  searchSite,
  openContactForm,
];

export function toolByName(name: string): Tool | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

// Dark features are never offered: no booking tools while booking is off, no
// estimate while the calculator is dark.
export function enabledTools(site: SiteFlags): readonly Tool[] {
  const booking = isPublished('book', site);
  const calculator = isPublished('calculator', site);
  return TOOLS.filter(
    (tool) =>
      (booking || !BOOKING_TOOLS.has(tool.name)) &&
      (calculator || tool.name !== 'estimate_project'),
  );
}

// What one agent surface (chat or voice) may call.
export function offeredTools(
  site: SiteFlags,
  surface: 'chat' | 'voice',
): readonly Tool[] {
  return enabledTools(site).filter((tool) => tool.surfaces.includes(surface));
}

export function manifest(site: SiteFlags) {
  return {
    version: 1,
    tools: enabledTools(site).map((tool) => ({
      name: tool.name,
      description: tool.description,
      readOnly: tool.readOnly,
      clientOnly: tool.clientOnly,
      inputSchema: z.toJSONSchema(tool.input, { io: 'input' }),
      outputSchema: z.toJSONSchema(tool.output),
    })),
  };
}
