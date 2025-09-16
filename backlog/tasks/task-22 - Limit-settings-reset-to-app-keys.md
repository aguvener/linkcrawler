---
id: task-22
title: Limit settings reset to app keys
status: To Do
assignee: []
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 12:17'
labels:
  - ux
  - stability
dependencies: []
priority: medium
---

## Description

Update SettingsModal reset logic to avoid calling localStorage.clear() and instead report failures via toast.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Remove localStorage.clear() fallback from reset flow.
- [ ] #2 Only app-prefixed keys are cleared during reset.
- [ ] #3 User receives an error toast when reset fails.
<!-- AC:END -->
