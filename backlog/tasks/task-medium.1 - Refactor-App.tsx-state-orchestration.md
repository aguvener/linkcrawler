---
id: task-medium.1
title: Refactor App.tsx state orchestration
status: To Do
assignee: []
created_date: '2025-09-16 12:58'
labels:
  - frontend
dependencies: []
parent_task_id: task-medium
---

## Description

App.tsx currently mixes toast handling, chat connection, storage, and modal control in one component. We should extract the core state/effect orchestration into dedicated hooks or context to shrink the component surface and make the UI layer cleaner.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 App.tsx delegates chat/link state and side-effect logic to extracted hook(s) or context provider
- [ ] #2 Component tree still renders existing modals, toasts, and header/footer without regression
- [ ] #3 Resulting App component stays under ~150 lines and focuses on layout/rendering
<!-- AC:END -->
