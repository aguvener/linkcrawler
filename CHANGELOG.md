# Changelog
All notable changes to this project will be documented in this file.

The format follows Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.3.0] - 2025-08-08
### Added
- Update notification system with aggregated release notes modal (Keep a Changelog parser, semantic versioning, and localStorage-backed acknowledgement).
- Link preview proxy via Cloudflare Pages Function with sanitization and smarter user-agents.

### Changed
- UI/UX polish for link preview hover (portal container, auto-positioning with viewport collision avoidance, improved delays, ARIA roles) and list item actions.
- Reduced console noise by showing debug logs only in development.
- Removed duplicate pointer/mouse hover handlers to prevent double-triggering in some browsers.

### Fixed
- Stability improvements for preview fetching and DOM measuring under various layouts.
- Safer storage initialization and graceful handling of corrupted localStorage values.
- Minor accessibility consistency for preview tooltip behavior and focus handling.

## [1.2.0] - 2025-08-06
### Added
- Link preview component with proxy API and caching (via functions/api/link-preview) enabling safe preview fetching.
- Inline username edit with validation and SSR-safe storage.
- Improved link preview UX: portal-based rendering, auto-positioning near viewport edges, and refined hover timing.

### Changed
- UI polish for link previews and hover behavior; simplified hover/portal creation for stability.

### Fixed
- Simplify and stabilize link preview hover/portal creation to reduce flicker.

### Security
- build(deps): bump link-preview-js and testing/tooling; set packageManager for reproducible installs.

### Maintenance
- Update repository housekeeping (chore/update).

## [1.1.0] - 2025-08-02
### Added
- Favicon badge showing the count of unopened links.

## [1.0.0] - 2025-07-29
### Added
- Initial public release.
- Middle-click support for quicker interactions.
- GitHub repository link and project documentation (README).
- Project license.

### Changed
- Removed popup message in favor of streamlined UX.

### Fixed
- Package configuration fixes.

[Unreleased]: https://github.com/aguvener/linkcrawler/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/aguvener/linkcrawler/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/aguvener/linkcrawler/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/aguvener/linkcrawler/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/aguvener/linkcrawler/releases/tag/v1.0.0
