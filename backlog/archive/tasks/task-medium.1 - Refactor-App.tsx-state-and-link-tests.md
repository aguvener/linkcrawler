---
id: task-medium.1
title: Refactor App.tsx state and link tests
status: To Do
assignee: []
created_date: '2025-09-16 12:56'
labels:
  - frontend
  - testing
dependencies: []
parent_task_id: task-medium
---

## Description

App.tsx currently owns toast/audio/link history logic plus WebSocket plumbing, making it difficult to maintain. We should extract the chat/link state management into dedicated hooks or context, optimize the linkMap update path to avoid repeated Map churn, and add targeted test coverage for the link ingestion flow.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 App.tsx delegates link/linkMap mutations to a dedicated hook or reducer with minimal inline logic
- [ ] #2 linkMap updates are optimized to avoid unnecessary Map re-creation while keeping ordering correct
- [ ] #3 New Vitest suites cover the chat message pipeline (useKickChat + addLink) including urgent link and blacklist scenarios
<!-- AC:END -->
