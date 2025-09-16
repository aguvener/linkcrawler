---
id: task-19
title: Canonicalize linkMap keys
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - performance
  - backend
dependencies: []
priority: medium
---

## Description

Change linkMap keying to use a canonical URL representation that lowercases scheme and host, strips fragments, and preserves path/query case.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Introduce a canonicalizer that lowercases scheme+host, strips hash, preserves path and query case.
- [ ] #2 Use canonical value as the map key while keeping displayed URL unchanged.
- [ ] #3 Duplicates consolidate appropriately and tests pass.
<!-- AC:END -->
