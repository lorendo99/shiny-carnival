---
name: Stripe connector and Sync compatibility
description: A connector-shape and Stripe Sync migration mismatch that can disable the API during startup.
---

The installed Stripe connector exposes its secret under the connector setting named `secret`, not `secret_key`. The Stripe Sync package’s migration helper completed without error but did not create the account relation its runtime then required.

**Why:** Making Sync initialization mandatory during API startup caused the whole FixMate API workflow to exit even though authenticated direct Stripe API access worked correctly.

**How to apply:** Keep customer checkout independent from Stripe Sync startup. Before re-enabling Sync or webhooks, verify the installed package migrations actually create the relations used by that same package version, then test a clean restart.