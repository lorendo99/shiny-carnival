---
name: Marketplace moderation
description: Durable safety and moderation rules for the FixMate repair marketplace.
---

Marketplace moderation is restricted to a configured Clerk user ID allow-list. Reports, blocks, and content filtering are part of the marketplace boundary, not an optional client-only feature.

**Why:** Marketplace participants need a private way to report or block unsafe behavior, while moderation records may need to remain available after an account is deleted.

**How to apply:** Keep report authorization relationship-based, enforce reciprocal blocks in every job/quote/message path, and de-identify report records during account deletion rather than retaining user identifiers or free-text details.