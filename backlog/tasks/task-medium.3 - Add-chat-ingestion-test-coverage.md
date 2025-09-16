---
id: task-medium.3
title: Add chat ingestion test coverage
status: To Do
assignee: []
created_date: '2025-09-16 12:58'
labels:
  - testing
dependencies: []
parent_task_id: task-medium
---

## Description

Critical flows like useKickChat and addLink lack Vitest coverage for blacklist, urgent messages, and link history integration. Create integration-style tests with mocked WebSocket events to guard regressions.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Vitest suite covers urgent link speech/toast flow
- [ ] #2 Tests assert blacklist + timeout scenarios skip link insertion
- [ ] #3 History and opened link counters update correctly across duplicate messages
<!-- AC:END -->
