import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { serverConfig, siteConfig } from './site.config.ts';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    __SITE__: JSON.stringify(siteConfig(process.env.CLOUDFLARE_ENV)),
    __GA4_ID__: JSON.stringify(siteConfig(process.env.CLOUDFLARE_ENV).ga4Id),
    __SERVER__: JSON.stringify(serverConfig(process.env.CLOUDFLARE_ENV)),
  },
  build: { modulePreload: false },
  plugins: [
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({ router: { routeFileIgnorePattern: '\\.test\\.' } }),
    react(),
  ],
});
