---
id: task-24
title: Combine link sort and filter pass
status: To Do
assignee: []
created_date: '2025-09-16 12:11'
updated_date: '2025-09-16 12:17'
labels:
  - performance
dependencies: []
priority: low
---

## Description

Optimize link derivation by computing filtered and sorted results in a single memoized pass.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Refactor sortedLinks computation to avoid multiple array traversals.
- [ ] #2 Ensure resulting list matches previous behavior for all filters and sorts.
- [ ] #3 Performance improves for large link sets without regressions.
<!-- AC:END -->
