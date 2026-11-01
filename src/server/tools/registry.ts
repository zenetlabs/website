import { z } from 'zod';
import { isPublished, type SiteFlags } from '@/lib/page-registry';
import { bookMeeting } from '@/server/tools/book-meeting';
import { checkAvailability } from '@/server/tools/check-availability';
import { estimateProject } from '@/server/tools/estimate-project';
import { getFaq } from '@/server/tools/get-faq';
import { getPricing } from '@/server/tools/get-pricing';
import { navigate } from '@/server/tools/navigate';
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
];

export function toolByName(name: string): Tool | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

export function enabledTools(site: SiteFlags): readonly Tool[] {
  const booking = isPublished('book', site);
  return TOOLS.filter((tool) => booking || !BOOKING_TOOLS.has(tool.name));
}

// What an agent (chat or voice) may call: the enabled tools, minus the estimate
// while the calculator is dark. Dark features are never offered.
export function offeredTools(site: SiteFlags): readonly Tool[] {
  return enabledTools(site).filter(
    (tool) =>
      tool.name !== 'estimate_project' || isPublished('calculator', site),
  );
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
