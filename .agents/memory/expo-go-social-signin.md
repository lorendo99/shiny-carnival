---
name: Expo Go social sign-in redirects
description: Callback URL behavior for Clerk social sign-in in Expo Go versus installed builds.
---

For Clerk OAuth in this Expo app, use `AuthSession.makeRedirectUri()` without forcing the standalone app scheme. Expo Go needs its own `exp://` return URL; an installed build can use the configured app scheme.

**Why:** Expo Go does not register the app's standalone custom scheme, so forcing it can strand the browser sign-in flow instead of returning to FixMate.

**How to apply:** Keep Expo Go and installed-build redirect handling runtime-derived. When debugging a blank screen after OAuth, verify callback return behavior separately from provider enablement in Clerk.