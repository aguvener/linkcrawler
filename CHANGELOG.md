# Changelog
All notable changes to this project will be documented in this file.

The format follows Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

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

[Unreleased]: https://github.com/aguvener/linkcrawler/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/aguvener/linkcrawler/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/aguvener/linkcrawler/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/aguvener/linkcrawler/releases/tag/v1.0.0