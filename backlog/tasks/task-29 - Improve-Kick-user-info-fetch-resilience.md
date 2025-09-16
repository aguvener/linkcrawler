---
id: task-29
title: Improve Kick user info fetch resilience
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

Enhance services/kickService.ts with AbortController timeouts and exponential backoff with jitter for retries.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Abort user info fetches after ~8–10s.
- [ ] #2 Implement exponential backoff with jitter between retries.
- [ ] #3 Surface friendly status messages when timeouts occur.
<!-- AC:END -->
