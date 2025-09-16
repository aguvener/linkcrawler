---
id: task-1
title: Add per-IP rate limiting to link preview function
status: To Do
assignee: []
created_date: '2025-09-16 12:09'
updated_date: '2025-09-16 12:15'
labels:
  - security
dependencies: []
priority: high
---

## Description

Introduce a KV-backed token bucket in the Cloudflare Pages Function that serves /api/link-preview so repeated requests from a single IP are throttled.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Throttle excessive requests from the same IP with 429 and retry headers.
- [ ] #2 Document KV key format and reset window in code comments.
- [ ] #3 Existing preview functionality continues to work for valid traffic.
<!-- AC:END -->
