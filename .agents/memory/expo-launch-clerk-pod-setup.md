---
name: Expo Launch Clerk native setup
description: Native iOS Clerk builds need the config plugin, SDK-aligned Expo packages, and platform-safe Apple authentication wiring.
---

Expo Launch iOS builds can fail during CocoaPods setup with `package_product_dependencies for nil` when Clerk is used without `@clerk/expo` in the static Expo plugins list. Keep `@clerk/expo` enabled in `app.json`, keep Expo package patch versions aligned with the installed SDK, and install required native peer dependencies such as `expo-asset`.

Clerk Expo's Apple subpath can resolve its non-iOS stub even from an iOS bundle. Keep native Apple token exchange in a local `.ios.ts` module, with a default module that reports native auth unavailable, and fall back to Clerk OAuth when `expo-apple-authentication` is unavailable.

**Why:** Clerk registers an iOS Swift package through React Native's CocoaPods hook; the config plugin is required for Expo to generate the matching native target. The Apple package-entry quirk otherwise surfaces the misleading "Apple Authentication is not available on this device" error.

**How to apply:** Before an iOS publish, run Expo dependency checks and an iOS export from the mobile artifact, then inspect the resolved config for the Clerk plugin and intended bundle identifier. Verify both native Apple auth and the OAuth fallback.