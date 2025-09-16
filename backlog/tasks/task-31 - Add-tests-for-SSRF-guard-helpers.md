---
id: task-31
title: Add tests for SSRF guard helpers
status: To Do
assignee: []
created_date: '2025-09-16 12:11'
updated_date: '2025-09-16 12:17'
labels:
  - security
  - testing
dependencies: []
priority: medium
---

## Description

Factor SSRF guard logic into a shared module and add unit tests covering IPv4/IPv6 and edge cases.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Extract isDisallowedTarget helper usable by preview and favicon functions.
- [ ] #2 Add Vitest coverage for localhost, private ranges, link-local, punycode, and long URLs.
- [ ] #3 Test suite passes.
<!-- AC:END -->
