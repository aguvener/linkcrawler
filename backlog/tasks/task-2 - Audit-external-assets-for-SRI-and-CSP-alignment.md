---
id: task-2
title: Audit external assets for SRI and CSP alignment
status: To Do
assignee: []
created_date: '2025-09-16 12:09'
updated_date: '2025-09-16 13:03'
labels:
  - security
dependencies: []
priority: high
---

## Description

Identify any remaining third-party assets and ensure they are removed or protected with Subresource Integrity hashes while keeping the Content Security Policy consistent.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory all external JS/CSS/font assets still referenced by the app.
- [ ] #2 Add or update SRI hashes for any required external assets.
- [ ] #3 Update CSP configuration to match the final asset list without introducing regressions.
<!-- AC:END -->
