---
name: RevenueCat Test Store product replacement
description: Constraints for safely replacing priced Test Store subscription products.
---

When changing Test Store subscription prices, create replacement products, detach the old products from packages and entitlements, and attach the replacements before cleanup. Products with transaction history must be archived rather than deleted.

**Why:** RevenueCat prices are immutable once created, packages reject a second product from the same app, and RevenueCat refuses to delete products that have transactions.

**How to apply:** Use this sequence for future Test Store price changes. Preserve App Store and Google Play products; their production prices remain managed in the store consoles.