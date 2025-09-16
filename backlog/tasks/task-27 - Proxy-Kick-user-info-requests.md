---
id: task-27
title: Proxy Kick user info requests
status: To Do
assignee: []
created_date: '2025-09-16 12:11'
updated_date: '2025-09-16 12:17'
labels:
  - backend
  - stability
dependencies: []
priority: low
---

## Description

Add an optional Cloudflare function that fetches Kick user info server-side with validation, timeouts, and standardized errors.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create api/kick-user function validating usernames and forwarding requests with conservative headers/timeouts.
- [ ] #2 Return sanitized JSON responses and clear error codes.
- [ ] #3 Allow app to toggle between direct and proxied fetch modes without regressions.
<!-- AC:END -->
