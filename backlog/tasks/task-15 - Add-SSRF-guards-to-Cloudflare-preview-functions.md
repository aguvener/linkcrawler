---
id: task-15
title: Add SSRF guards to Cloudflare preview functions
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:16'
labels:
  - security
  - backend
dependencies: []
priority: high
---

## Description

Harden link preview and favicon proxy functions against SSRF by blocking internal hosts, enforcing URL limits, and validating redirects.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Reject disallowed hosts (localhost, *.local, *.internal, RFC1918, loopback, link-local ranges) with DISALLOWED_HOST.
- [ ] #2 Enforce a maximum URL length (e.g., 2048 characters) returning URL_TOO_LONG when exceeded.
- [ ] #3 Revalidate redirect targets or use conservative redirect handling so final URLs remain allowed.
- [ ] #4 All existing public URLs continue to work and tests pass.
<!-- AC:END -->
