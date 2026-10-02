---
name: Media analysis runtime
description: FFmpeg tooling is required by the diagnosis media pipeline.
---

Diagnosis media validation and frame/audio extraction invoke `ffprobe` and `ffmpeg` as system commands.

**Why:** The API can accept an upload successfully and still fail the diagnosis request if the runtime image does not include FFmpeg.

**How to apply:** Keep FFmpeg declared as a workspace system dependency whenever the diagnosis API is deployed or its runtime is rebuilt.