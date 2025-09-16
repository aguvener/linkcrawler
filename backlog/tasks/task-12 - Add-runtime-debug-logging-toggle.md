---
id: task-12
title: Add runtime debug logging toggle
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - observability
dependencies: []
priority: medium
---

## Description

Centralize console logging behind a runtime debug flag in settings while keeping existing NODE_ENV guards.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Provide a settings toggle to enable structured debug logging.
- [ ] #2 Wrap console logging helpers to respect the runtime flag and NODE_ENV checks.
- [ ] #3 Add consistent prefixes to logged messages.
<!-- AC:END -->
