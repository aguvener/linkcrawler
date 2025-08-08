Update Notification System (Client-side)
This document explains how the client-side versioning and update notification system is implemented and how to integrate/customize it.

Overview
- Versioning and persistence
  - The current app version is defined in App.tsx as a string constant (APP_VERSION). Bump this on each release.
  - Persistence uses localStorage with namespaced keys and a schema version.
  - The system records:
    - lastSeenVersion: highest version the user acknowledged
    - seenVersions: set of all versions acknowledged
    - silentVersions: optional set of versions you want to suppress from notifications
  - Multi-tab synchronization is supported via storage events (broadcastPing/onPing).

- Update modal behavior
  - On app load and optionally at interval, the controller checks:
    1) If current version is already seen => no modal.
    2) If downgrade detected (current < lastSeenVersion) => no modal (no overwrite).
    3) Otherwise it fetches /CHANGELOG.md, parses it, aggregates unseen releases, and renders an UpdateModal.
  - When dismissed (“Got it”), the current version is marked seen and lastSeenVersion is updated if monotonic.
  - Accessibility: modal is keyboard navigable, ESC closable, focus-trapped, and theme-aware.

- CHANGELOG integration
  - CHANGELOG.md follows Keep a Changelog style.
  - The parser extracts releases by headings like:
    ## [1.2.3] - 2025-07-20
  - Sections recognized: Added, Changed, Fixed, Deprecated, Removed, Security.
  - Aggregator pulls all releases in (lastSeen, current], sorted oldest-first for display.
  - Fallback if parsing/fetch fails: show a generic update message for current version.

- New version detection and aggregation
  - If a new version (compared to lastSeen) is found, the system aggregates all unseen release notes between the last seen version (exclusive) and the current version (inclusive).
  - Configurable rules:
    - minorMajorOnly: show only for minor/major bumps (default true; patches suppressed).
    - allowPrereleaseIfFromPrerelease: prereleases are eligible if last seen was also a prerelease (default true).

Source Files
- services/update/semver.ts
  - SemVer parse/compare helpers with prerelease support.
  - Functions: parseSemver(), compareSemver(), gt/gte/lt/lte/eq(), classifyBump(), isPrerelease(), inOpenClosedRange(), isEligibleForNotification().
- services/update/versionStorage.ts
  - Local storage layer with namespaced keys and a simple migration.
  - Keys:
    - app:update:schemaVersion
    - app:update:lastSeenVersion
    - app:update:seenVersions
    - app:update:silentVersions
  - Helpers: initializeStorage(), get/setLastSeenVersion(), add/hasSeenVersion(), add/removeSilentVersion(), broadcastPing(), onPing().
- services/update/changelog.ts
  - Parser for Keep a Changelog style markdown.
  - Exports parseChangelog(), renderReleaseSummary().
- services/update/aggregator.ts
  - Aggregates unseen releases between last seen and current versions.
  - Options for minorMajorOnly and prerelease gating.
- services/update/controller.ts
  - Orchestrates detection, fetching, parsing, aggregation, and exposes callbacks to show/hide a modal.
  - Public API:
    - init(): start checks and storage syncing
    - dispose(): tear down interval handlers
    - markCurrentSeen(): mark the current version as acknowledged
- components/modals/UpdateModal.tsx
  - Self-contained React modal with accessible markup and keyboard support.
- hooks/useUpdateNotifications.ts
  - React hook wrapping the controller for easy integration in App.tsx.
- services/update/styles.css
  - Minimal theme-aware CSS for update modal content.
- public/demo/index.html & public/demo/update-notify.js
  - Vanilla JavaScript demo to showcase the controller independently of React.

React Integration
1) Import and use the hook and modal in App.tsx:
   - Add imports:
     - import { UpdateModal } from './components/modals/UpdateModal';
     - import { useUpdateNotifications } from './hooks/useUpdateNotifications';
   - Define app version constant and initialize the hook:
     - const APP_VERSION = '1.4.0';
     - const { isOpen, html, close, acknowledge } = useUpdateNotifications({ appVersion: APP_VERSION, changelogUrl: '/CHANGELOG.md', checkOnIntervalMs: 0, minorMajorOnly: true, allowPrereleaseIfFromPrerelease: true });
   - Render the modal near the root:
     - <UpdateModal isOpen={isOpen} onClose={close} onAcknowledge={acknowledge} html={html} />

2) Styling
   - Optional: import services/update/styles.css to add some default styling for content inside the modal:
     - For Tailwind projects: you can copy the selectors and integrate as needed or import this CSS in index.tsx.

Vanilla JS Example
- Open public/demo/index.html via Vite dev server: http://localhost:5173/public/demo/
- Adjust the version and preferences from the page controls.
- Click “Start Controller” to run checks and show a modal when appropriate.
- “Reset Storage” clears localStorage for the demo scope.

Testing
- Unit tests are included:
  - __tests__/semver.test.ts
  - __tests__/changelog_aggregator_storage.test.ts
- Run tests:
  - npm run test
- Notes:
  - Storage is mocked via a minimal in-memory localStorage for tests.
  - Parser and aggregator tests validate ordering and gating logic.

Configuration Options
- appVersion: current app version (string), e.g., '1.4.0'.
- changelogUrl: URL to fetch CHANGELOG.md (default '/CHANGELOG.md').
- checkOnIntervalMs: optional polling interval in ms; set 0 to disable scheduled checks.
- minorMajorOnly: boolean to suppress patch-only updates (default true).
- allowPrereleaseIfFromPrerelease: boolean; prereleases show only if last seen was also prerelease (default true).

Edge Cases and Handling
- Downgrades:
  - If current < lastSeenVersion, the modal does not show, and we do not overwrite lastSeen.
- Pre-release tags:
  - 1.2.0-beta < 1.2.0. With gating enabled, prerelease notes are shown only if the last seen was prerelease.
- Missing/malformed CHANGELOG.md:
  - Fallback to a generic modal for current version.
- First-time users:
  - lastSeenVersion is null. The aggregator will include versions from the earliest qualifying non-patch version up to current. Patches are suppressed if minorMajorOnly is true.
- Silent patches:
  - You can suppress specific versions by adding to silentVersions via versionStorage addSilentVersion(). The aggregator respects silentVersions.
- Multi-tab synchronization:
  - When a tab acknowledges, markCurrentSeen() calls broadcastPing(); other tabs listening via onPing() will close the modal if visible and version state indicates seen.

Bundling CHANGELOG.md
- This implementation fetches /CHANGELOG.md at runtime (no bundler plugin required).
- Ensure that CHANGELOG.md is copied to the server root or public/ in your build. With Vite, placing it at repo root is typically sufficient since dev serves from project root. For production, copy it to the final public root (e.g. keep it in repo root and configure static hosting or place a copy under public/CHANGELOG.md).

Cache busting and version constants
- Bump APP_VERSION in App.tsx on each release.
- If you rely on aggressive caching for CHANGELOG.md, consider adding a query string: changelogUrl: `/CHANGELOG.md?ts=${Date.now()}` or a build hash.

Customization
- Modal content/branding:
  - Update components/modals/UpdateModal.tsx structure and styles.
  - Add your logo, change buttons, or integrate with your design system.
- Content rendering:
  - services/update/controller.ts uses renderReleaseSummary() for a simplified view. You can render structured lists from release.sections to customize the layout.
- Rules:
  - Adjust aggregator.ts to change criteria for inclusion (e.g., show patches but collapse them, or introduce custom tags in CHANGELOG).

API Summary
- Semver helpers: parseSemver(), compareSemver(), classifyBump(), isPrerelease(), etc.
- Storage helpers: initializeStorage(), getLastSeenVersion(), setLastSeenVersion(), addSeenVersion(), hasSeenVersion(), addSilentVersion(), removeSilentVersion(), broadcastPing(), onPing().
- Changelog parser: parseChangelog(md), renderReleaseSummary(release).
- Aggregator: aggregateUnseenReleases(releases, lastSeen, current, options).
- Controller: new UpdateController(config).init(), dispose(), markCurrentSeen().
- React Hook: useUpdateNotifications(options) => { isOpen, html, versions, acknowledge, close }.
- React Modal: <UpdateModal isOpen onClose onAcknowledge html />.

File References
- App entry: App.tsx
- Hook: hooks/useUpdateNotifications.ts
- Controller: services/update/controller.ts
- Aggregator: services/update/aggregator.ts
- Changelog parser: services/update/changelog.ts
- Storage: services/update/versionStorage.ts
- Semver: services/update/semver.ts
- React modal: components/modals/UpdateModal.tsx
- Minimal CSS: services/update/styles.css
- CHANGELOG template: CHANGELOG.md
- Vanilla demo: public/demo/index.html and public/demo/update-notify.js