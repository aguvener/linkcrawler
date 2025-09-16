---
id: task-21
title: Tighten chat URL extraction
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:17'
labels:
  - stability
  - backend
dependencies: []
priority: medium
---

## Description

Update the chat message URL extraction logic to focus on http/https/www patterns and trim trailing punctuation.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Regex matches only https?:// and www. URL forms.
- [ ] #2 Trailing punctuation such as .,) ;] is trimmed before processing.
- [ ] #3 Existing behaviors for adding http:// to www. URLs remain.
<!-- AC:END -->
