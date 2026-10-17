import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { siteConfig } from './site.config.ts';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    __SITE__: JSON.stringify(siteConfig(process.env.CLOUDFLARE_ENV)),
  },
  plugins: [
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({ router: { routeFileIgnorePattern: '\\.test\\.' } }),
    react(),
  ],
});
