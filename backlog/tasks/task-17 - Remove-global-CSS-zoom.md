---
id: task-17
title: Remove global CSS zoom
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - accessibility
  - performance
dependencies: []
priority: high
---

## Description

Eliminate the html-level zoom override in index.css and verify layout remains correct.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Remove html { zoom: ... } from global styles.
- [ ] #2 Confirm UI scales correctly without the zoom hack.
- [ ] #3 All tests continue to pass.
<!-- AC:END -->
