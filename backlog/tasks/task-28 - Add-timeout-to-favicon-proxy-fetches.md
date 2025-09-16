---
id: task-28
title: Add timeout to favicon proxy fetches
status: To Do
assignee: []
created_date: '2025-09-16 12:11'
updated_date: '2025-09-16 12:17'
labels:
  - backend
  - stability
dependencies: []
priority: medium
---

## Description

Guard proxy-favicon upstream requests with AbortController timeouts and clear error codes.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Abort upstream fetches after ~5s and return 504 with FETCH_TIMEOUT.
- [ ] #2 Maintain existing SSRF safeguards and headers.
- [ ] #3 Normal image requests remain unaffected.
<!-- AC:END -->
