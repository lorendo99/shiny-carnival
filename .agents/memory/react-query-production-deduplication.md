---
name: React Query production deduplication
description: A production-only bundling constraint for FixMate's generated API hooks and app provider.
---

Keep `@tanstack/react-query` in Vite's dependency deduplication list.

**Why:** Without explicit deduplication, the production manual-chunk build included separate React Query module instances. Hooks then raised “No QueryClient set” even though the app rendered a `QueryClientProvider`; development remained unaffected.

**How to apply:** Preserve the dedupe entry when changing Vite resolution, workspace dependencies, generated API clients, or chunk splitting. Verify the built production bundle, not only the development server.