---
name: Mobile subscription analytics
description: Native subscription funnel measurement must use an app-specific event path alongside RevenueCat.
---

Native mobile subscription behavior must not rely on Replit-hosted web analytics alone. Use RevenueCat as the source for store transactions and entitlements, plus a small app-specific event path for paywall views, plan selection, purchase outcomes, and restore outcomes.

**Why:** Web analytics does not reliably receive native-app events, while RevenueCat does not represent every funnel interaction such as viewing the Plus screen or selecting a plan.

**How to apply:** Keep event names allowlisted, attach plan and store identifiers where available, allow anonymous paywall events, associate authenticated events with the Clerk user, and never let tracking failures block purchases or restores.