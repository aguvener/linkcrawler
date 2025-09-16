---
id: task-20
title: Add type guards for handleNewMessage
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - stability
  - backend
dependencies: []
priority: medium
---

## Description

Strengthen chat message handling by using ParsedChatMessageData types, guards, and optional chaining to avoid runtime crashes.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Type msgData as ParsedChatMessageData with safe access patterns.
- [ ] #2 Use optional chaining/defaults for badge-based checks.
- [ ] #3 Build succeeds with strict TypeScript and behavior remains tolerant to malformed data.
<!-- AC:END -->
