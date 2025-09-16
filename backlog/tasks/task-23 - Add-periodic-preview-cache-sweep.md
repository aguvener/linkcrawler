---
id: task-23
title: Add periodic preview cache sweep
status: To Do
assignee: []
created_date: '2025-09-16 12:11'
updated_date: '2025-09-16 12:17'
labels:
  - performance
dependencies: []
priority: medium
---

## Description

Periodically clear expired entries from the in-memory preview cache during active sessions.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Set up an interval (≈5–10 minutes) when document is visible to call clearExpired().
- [ ] #2 Ensure sweep pauses when tab is hidden or on teardown.
- [ ] #3 Memory usage stays bounded in long-running sessions.
<!-- AC:END -->
