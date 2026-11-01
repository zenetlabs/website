import { expect, type Page, test } from '@playwright/test';
import { z } from 'zod';
import {
  BOOKING_PUBLISHED,
  gotoHydrated,
  lateSlot,
  WEBMCP_PUBLISHED,
} from './helpers';

test.skip(!WEBMCP_PUBLISHED, 'WebMCP is not published in this build');

const EXPECTED = BOOKING_PUBLISHED ? 6 : 4;

// Chrome's own implementation, behind --enable-blink-features=WebMCP. This is
// the drift alarm: it breaks loudly if the API or its result format moves.
async function tools(page: Page) {
  return page.evaluate(async () => {
    if (!('modelContext' in document)) return null;
    const context: unknown = document.modelContext;
    if (
      typeof context !== 'object' ||
      context === null ||
      !('getTools' in context) ||
      typeof context.getTools !== 'function'
    ) {
      return null;
    }
    const list: unknown = await context.getTools();
    const items: unknown[] = Array.isArray(list) ? list : [];
    return items.flatMap((item) =>
      typeof item === 'object' &&
      item !== null &&
      'name' in item &&
      'title' in item &&
      'annotations' in item
        ? [
            {
              name: item.name,
              title: item.title,
              annotations: Object.assign({}, item.annotations),
            },
          ]
        : [],
    );
  });
}

const toolList = z.array(
  z.object({
    name: z.string(),
    title: z.string(),
    annotations: z.object({
      readOnlyHint: z.boolean(),
      consequentialHint: z.boolean(),
    }),
  }),
);

async function listed(page: Page) {
  const parsed = toolList.safeParse(await tools(page));
  return parsed.success ? parsed.data : [];
}

const envelope = z.object({ ok: z.boolean(), result: z.unknown().optional() });

async function execute(page: Page, name: string, input: unknown) {
  const call = page.evaluate(
    async ([toolName, toolInput]) => {
      if (!('modelContext' in document)) throw new Error('no modelContext');
      const context: unknown = document.modelContext;
      if (
        typeof context !== 'object' ||
        context === null ||
        !('getTools' in context) ||
        typeof context.getTools !== 'function' ||
        !('executeTool' in context) ||
        typeof context.executeTool !== 'function'
      ) {
        throw new Error('unsupported');
      }
      const list: unknown = await context.getTools();
      const tool = Array.isArray(list)
        ? list.find(
            (item: unknown) =>
              typeof item === 'object' &&
              item !== null &&
              'name' in item &&
              item.name === toolName,
          )
        : undefined;
      return String(await context.executeTool(tool, toolInput));
    },
    [name, input],
  );
  call.catch(() => undefined);
  return call;
}

test('Chrome lists the tools and runs them', async ({ page }) => {
  await gotoHydrated(page, '/');
  await expect
    .poll(async () => (await listed(page)).length, { timeout: 20_000 })
    .toBe(EXPECTED);
  const list = await listed(page);
  expect(
    list.find((tool) => tool.name === 'get_pricing')?.annotations,
  ).toMatchObject({
    readOnlyHint: true,
  });
  expect(list.find((tool) => tool.name === 'navigate')?.title).toBe(
    'Go to a page',
  );

  const pricing = envelope.parse(
    JSON.parse(await execute(page, 'get_pricing', {})),
  );
  expect(pricing).toMatchObject({ ok: true, result: { currency: 'SGD' } });

  await execute(page, 'navigate', { page: 'home', section: 'faq' });
  await expect(page).toHaveURL(/#faq$/);
});

test.describe('book_meeting', () => {
  test.skip(!BOOKING_PUBLISHED, 'booking is not published in this build');

  test('opens the confirmation and reports a decline', async ({ page }) => {
    await gotoHydrated(page, '/');
    await expect
      .poll(async () => (await listed(page)).length, { timeout: 20_000 })
      .toBe(EXPECTED);
    const slot = await lateSlot(
      async (name, input): Promise<unknown> =>
        JSON.parse(await execute(page, name, input)),
    );
    const call = execute(page, 'book_meeting', {
      slot,
      topic: 'Automate our inbox triage',
    });
    const dialog = page.getByRole('dialog', { name: 'Confirm your call' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(JSON.parse(await call)).toEqual({
      ok: true,
      result: { status: 'declined' },
    });
  });
});
