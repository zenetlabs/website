import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { serverConfig, siteConfig } from './site.config.ts';

const maxWorkers = Number(process.env.VITEST_MAX_WORKERS);
const shared = {
  resolve: { tsconfigPaths: true },
  define: {
    __SITE__: JSON.stringify(siteConfig('production')),
    __GA4_ID__: JSON.stringify(siteConfig('production').ga4Id),
    __SERVER__: JSON.stringify(serverConfig('production')),
    __ASSISTANT__: JSON.stringify(siteConfig('production').assistant.published),
    __WEBMCP__: JSON.stringify(siteConfig('production').webmcp.published),
    __CHAT_FAKE__: JSON.stringify(false),
  },
};
const limits = maxWorkers > 0 ? { maxWorkers } : {};

export default defineConfig(async () => ({
  test: {
    ...limits,
    projects: [
      {
        ...shared,
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'happy-dom',
          globals: true,
          css: false,
          setupFiles: ['./test/vitest-setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['**/node_modules/**', 'src/**/*.worker.test.ts'],
        },
      },
      {
        ...shared,
        resolve: {
          alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        },
        plugins: [
          cloudflareTest({
            miniflare: {
              compatibilityDate: '2026-03-01',
              compatibilityFlags: ['nodejs_compat'],
              d1Databases: ['DB', 'UNMIGRATED_DB'],
              bindings: {
                TEST_MIGRATIONS: await readD1Migrations('migrations'),
              },
            },
          }),
        ],
        test: {
          name: 'workers',
          globals: true,
          setupFiles: ['./test/apply-migrations.ts'],
          include: ['src/**/*.worker.test.ts'],
        },
      },
    ],
  },
}));
