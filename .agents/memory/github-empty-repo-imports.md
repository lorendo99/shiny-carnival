---
name: GitHub empty-repo imports
description: How to publish an initial repository snapshot through GitHub's connected REST API.
---

When the Git CLI cannot authenticate and the GitHub repository is empty, Git Data API blob creation can return `409 Git Repository is empty`. Create the first commit through the repository Contents API, then upload blobs, create a tree and commit, and advance the branch reference.

**Why:** Git Data API operations may be unavailable until the repository has an initial commit and branch.

**How to apply:** For an authorized snapshot import to an empty repository, verify the remote is still empty, create a small seed commit, then use Git Data API with that commit as the base and parent. Do not force-update an existing branch.