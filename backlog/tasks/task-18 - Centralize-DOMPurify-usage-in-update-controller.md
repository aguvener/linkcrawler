---
id: task-18
title: Centralize DOMPurify usage in update controller
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - performance
  - security
dependencies: []
priority: medium
---

## Description

Refactor services/update/controller.ts to create a single DOMPurify instance per render call instead of per release.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Only one createDOMPurify call occurs per renderHtmlForReleases invocation.
- [ ] #2 Sanitization configuration remains the same and reused for each release.
- [ ] #3 Existing update-related tests pass.
<!-- AC:END -->
