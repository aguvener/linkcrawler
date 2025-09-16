---
id: task-30
title: Self-host Inter font and tighten CSP
status: To Do
assignee: []
created_date: '2025-09-16 12:11'
updated_date: '2025-09-16 12:17'
labels:
  - security
  - ux
dependencies: []
priority: medium
---

## Description

Bundle the Inter font locally, remove Google Fonts dependencies, and update CSP to drop unsafe-inline and external font hosts.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add Inter font assets under public/fonts and reference them locally.
- [ ] #2 Remove Google Fonts links from index.html and related CSS.
- [ ] #3 Update CSP to restrict style-src to self without unsafe-inline.
<!-- AC:END -->
