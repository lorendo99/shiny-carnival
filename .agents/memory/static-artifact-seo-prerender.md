---
name: Static artifact SEO prerender
description: Route-specific HTML output and verification for Vite sites published as Replit static artifacts.
---

Replit's static deployment serves a concrete route file ahead of a matching wildcard rewrite. Vite's dev/preview server may still use the SPA fallback for nested URLs, even when route-specific HTML files exist in the production output.

**Why:** Testing only through Vite preview can make working production prerendered routes look as if they are being ignored.

**How to apply:** Generate route-specific files during the production build, verify their metadata and body directly in the build output, and use Replit's static-deployment routing behavior when checking whether a wildcard rewrite will shadow those files.