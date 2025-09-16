---
id: task-10
title: Clarify tooltip semantics for previews
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - accessibility
  - ux
dependencies: []
priority: medium
---

## Description

Adjust tooltip ARIA semantics so preview triggers use tooltip roles unless the preview becomes interactive, in which case aria-haspopup=dialog is appropriate.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Review current tooltip markup for preview hovers.
- [ ] #2 Update ARIA attributes to match expected semantics for tooltip vs dialog.
- [ ] #3 Verify assistive technology announces previews correctly.
<!-- AC:END -->
