---
id: task-16
title: Disallow SVG favicons in proxy
status: Done
assignee:
  - '@assistant'
created_date: '2025-09-16 12:10'
updated_date: '2025-09-16 13:08'
labels:
  - security
dependencies: []
priority: high
---

## Description

Tighten the favicon proxy to reject image/svg+xml responses.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Remove image/svg+xml from the allowed content types.
- [x] #2 Return 415 with UNSUPPORTED_TYPE when an SVG favicon is requested.
- [x] #3 Existing raster favicon handling remains unchanged.
<!-- AC:END -->


## Implementation Plan

1. Remove image/svg+xml from the allowed content types in proxy-favicon.
2. Add unit tests ensuring SVG responses return 415 with UNSUPPORTED_TYPE.
3. Add test confirming png/jpeg responses continue to stream successfully.
4. Run Vitest suite to validate.


## Implementation Notes

Implementation:
- Removed image/svg+xml from ALLOWED_CONTENT_TYPES so SVG favicons return UNSUPPORTED_TYPE 415.
- Added proxyFavicon vitest coverage for raster passthrough and SVG rejection.
- Ran pnpm test.
