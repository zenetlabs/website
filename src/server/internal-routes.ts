import { env } from 'cloudflare:workers';
import { z } from 'zod';
import {
  CSV_MAX_ROWS,
  csvResponse,
  htmlResponse,
  leadDetailHtml,
  leadsCsv,
  leadsListHtml,
} from '@/server/internal-leads';
import { exportLeads, getLead, leadsOverview } from '@/server/lead-store';
import { errorName, textResponse } from '@/server/responses';

const LIST_LIMIT = 100;

async function guarded(render: () => Promise<Response>): Promise<Response> {
  try {
    return await render();
  } catch (error) {
    console.error('internal: render failed', { error: errorName(error) });
    return textResponse('Unavailable', 503);
  }
}

export function leadsPage(): Promise<Response> {
  return guarded(async () => {
    const { leads, counts } = await leadsOverview(env.DB, LIST_LIMIT);
    return htmlResponse(leadsListHtml(leads, counts));
  });
}

export function leadPage(id: string): Promise<Response> {
  return guarded(async () => {
    const parsed = z.uuid().safeParse(id);
    const found = parsed.success ? await getLead(env.DB, parsed.data) : null;
    if (!found) return textResponse('Not found', 404);
    return htmlResponse(leadDetailHtml(found.lead, found.emails));
  });
}

export function leadsCsvFile(): Promise<Response> {
  return guarded(async () => {
    const { leads, truncated } = await exportLeads(env.DB, CSV_MAX_ROWS);
    return csvResponse(leadsCsv(leads, truncated), Date.now());
  });
}
