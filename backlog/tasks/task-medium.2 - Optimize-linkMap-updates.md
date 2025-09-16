---
id: task-medium.2
title: Optimize linkMap updates
status: To Do
assignee: []
created_date: '2025-09-16 12:58'
labels:
  - frontend
  - performance
dependencies: []
parent_task_id: task-medium
---

## Description

linkMap churns new Map instances and reorders entries excessively. Introduce a lean data structure or mutation strategy that preserves ordering, trims history, and dedupes without repeatedly rebuilding the map.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 linkMap update helper avoids full Map recreation on every message
- [ ] #2 Duplicate detection keeps most recent timestamp and count while preserving list ordering
- [ ] #3 MAX_DISPLAY_LINKS pruning happens in the optimized helper with clear tests or instrumentation
<!-- AC:END -->
