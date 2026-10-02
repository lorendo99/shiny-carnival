---
name: Camera-first diagnosis entry
description: Product and privacy constraint for the FixMate homepage diagnosis funnel.
---

The diagnosis entry should make a photo the first and most prominent evidence action, while keeping a clear no-photo route for users who cannot or do not want to share media. Selecting evidence locally before safety triage is acceptable; uploading it or sending it for analysis is not.

**Why:** Users need to see the value of visual evidence early, but FixMate's safety triage must happen before any evidence leaves the device or enters the diagnosis flow.

**How to apply:** Preserve the photo-first UI and explicit no-photo fallback when changing the homepage form. Keep upload lifecycle analytics separate from local selection analytics, and never include filenames or diagnosis details in those events.