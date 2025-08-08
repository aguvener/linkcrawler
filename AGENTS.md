# Repository Guidelines

## Project Structure & Module Organization
- Source: React + TypeScript with Vite.
- Key dirs: `components/` (UI, layout, modals, previews), `hooks/`, `services/` (incl. `update/` utilities), `functions/api/` (Cloudflare Pages Functions), `types/`, `public/`, `__tests__/`.
- App entry: `index.tsx` → `App.tsx`. Build output in `dist/`.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server (defaults to http://localhost:5173).
- `npm run build`: Production build to `dist/`.
- `npm run preview`: Preview the production build locally.
- `npm test`: Run Vitest test suite in jsdom.
- `npm run test:watch`: Watch mode for tests.

## Coding Style & Naming Conventions
- Language: TypeScript (strict mode enabled).
- Components: PascalCase filenames/exports (e.g., `components/LinkList.tsx`).
- Hooks: `useX.ts` (e.g., `hooks/useKickChat.ts`).
- Services/utilities: camelCase filenames (e.g., `services/previewCache.ts`).
- CSS modules: `.module.css` next to component.
- Use single quotes, include semicolons, and match surrounding file style. Avoid unused variables/params (TS config enforces these).

## Testing Guidelines
- Framework: Vitest + Testing Library (`@testing-library/react`) with jsdom.
- Location: `__tests__/`; name files `*.test.ts` or `*.test.tsx`.
- Write deterministic tests; use fake timers where appropriate (see `LinkWithPreview.test.tsx`).
- Add tests for new logic in `services/update/*` and interactive components.

## Commit & Pull Request Guidelines
- Commit messages: follow Conventional Commits (`feat(ui): ...`, `fix(docs): ...`, `build(deps): ...`).
- PRs: keep focused and describe the change, rationale, and impact. Link related issues.
- UI changes: include before/after screenshots or a short clip.
- Tests: required for new features/bug fixes. Ensure `npm test` and `npm run build` pass locally.

## Security & Configuration Tips
- CI security scanning runs via Semgrep (see `.github/workflows/semgrep.yml`). Address findings or explain mitigations in PRs.
- Link previews: server-side function at `functions/api/link-preview.ts` sanitizes and normalizes data; do not bypass this in client code.
- Storage: user settings/history persist in `localStorage`—avoid storing secrets.
- Environment: Node 18+ and npm 10+ recommended (repo uses `"packageManager": "npm@10.x"`).

