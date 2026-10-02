---
name: RevenueCat project isolation
description: Prevent production FixMate subscriptions from using a test store or an unrelated RevenueCat catalog.
---

Production native builds must require the platform-specific RevenueCat public key and fail closed when it is absent. Test Store access is only appropriate for development, web previews, and Expo Go.

Before reading or changing products, confirm that the connected RevenueCat catalog is the FixMate project and contains an Apple app, the `fixmate_plus` entitlement, and monthly/annual products attached to the current offering.

**Why:** A working RevenueCat connection can still point to another app's catalog. Test entitlements or an unrelated catalog can make paid digital access appear available outside Apple while App Store purchases remain unavailable, causing a Guideline 3.1.1 rejection.

**How to apply:** Verify project/app names and package attachments before any RevenueCat write. For App Store submissions, confirm the Apple products are synchronized, attached to the current offering, and submitted with the app version.