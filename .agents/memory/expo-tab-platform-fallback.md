---
name: Expo tab platform fallback
description: Platform guard needed for Expo Router native tab layout
---

The Expo Router native liquid-glass tab layout must only be selected when `Platform.OS === 'ios'` and liquid-glass support is available. Web and Android need the classic tab layout.

**Why:** Selecting the native tab branch on web can produce a completely blank preview without a JavaScript exception, even though Metro bundles successfully.

**How to apply:** Preserve the platform check when touching `artifacts/fixmate-mobile/app/(tabs)/_layout.tsx`, and verify web previews after changing tab behavior.