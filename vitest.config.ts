import react from '@vitejs/plugin-react';
import { siteConfig } from './site.config.ts';

const maxWorkers = Number(process.env.VITEST_MAX_WORKERS);

export default {
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  define: { __SITE__: JSON.stringify(siteConfig('production')) },
  test: {
    environment: 'happy-dom',
    globals: true,
    css: false,
    setupFiles: ['./test/vitest-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    ...(maxWorkers > 0 ? { maxWorkers } : {}),
  },
};
