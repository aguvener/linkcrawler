---
id: task-26
title: Normalize settings import/export types
status: To Do
assignee: []
created_date: '2025-09-16 12:11'
updated_date: '2025-09-16 12:17'
labels:
  - stability
dependencies: []
priority: low
---

## Description

Ensure exported settings JSON contains correct value types and that imports coerce or ignore inconsistent values.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Coerce numeric settings to numbers when exporting.
- [ ] #2 Validate and normalize types during import, ignoring unknown keys.
- [ ] #3 Vitest suite passes.
<!-- AC:END -->
