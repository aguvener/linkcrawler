---
id: task-16
title: Disallow SVG favicons in proxy
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - security
dependencies: []
priority: high
---

## Description

Tighten the favicon proxy to reject image/svg+xml responses.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Remove image/svg+xml from the allowed content types.
- [ ] #2 Return 415 with UNSUPPORTED_TYPE when an SVG favicon is requested.
- [ ] #3 Existing raster favicon handling remains unchanged.
<!-- AC:END -->
