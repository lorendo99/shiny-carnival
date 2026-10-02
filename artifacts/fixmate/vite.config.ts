import path from 'path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { getSeoPrerenderPages } from './src/lib/seo-prerender';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

function seoPrerenderPlugin(): Plugin {
  return {
    name: 'fixmate-seo-prerender',
    apply: 'build',
    async closeBundle() {
      const outputDir = path.resolve(import.meta.dirname, 'dist/public');
      const template = await readFile(path.join(outputDir, 'index.html'), 'utf8');
      const pages = getSeoPrerenderPages();

      for (const page of pages) {
        const canonicalUrl = `https://fixmate.repair${page.path === '/' ? '/' : page.path}`;
        let html = template.replace(
          /<title>[^<]*<\/title>/,
          `<title>${escapeHtml(page.title)}</title>`,
        );
        html = replaceMeta(html, 'name', 'description', page.description);
        html = replaceMeta(html, 'name', 'robots', page.noindex ? 'noindex, nofollow' : 'index, follow');
        html = replaceMeta(html, 'property', 'og:title', page.title);
        html = replaceMeta(html, 'property', 'og:description', page.description);
        html = replaceMeta(html, 'property', 'og:url', canonicalUrl);
        html = replaceMeta(html, 'name', 'twitter:title', page.title);
        html = replaceMeta(html, 'name', 'twitter:description', page.description);
        html = html.replace(
          /<link rel="canonical" href="[^"]*"\s*\/?\s*>/,
          `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
        );
        html = html.replace(
          '<div id="root"></div>',
          `<div id="root">${page.content}</div>`,
        );

        if (page.path === '/') {
          const schema = [
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'FixMate',
              url: 'https://fixmate.repair/',
              description: page.description,
              inLanguage: 'en-GB',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'FixMate',
              url: 'https://fixmate.repair/',
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Web',
              description: page.description,
            },
          ];
          html = html.replace(
            '</head>',
            `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`,
          );
        }

        const targetPath = page.path === '/'
          ? path.join(outputDir, 'index.html')
          : path.join(outputDir, page.path.slice(1), 'index.html');
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, html);
      }
    },
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function replaceMeta(
  html: string,
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${attribute}="${escapedKey}"\\s+content="[^"]*"\\s*\\/?>`);
  const replacement = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace('</head>', `${replacement}\n</head>`);
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
      seoPrerenderPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          clerk: ['@clerk/react', '@clerk/themes'],
          react: ['react', 'react-dom', 'wouter'],
          query: ['@tanstack/react-query'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
