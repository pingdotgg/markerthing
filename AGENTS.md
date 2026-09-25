# MarkerThing

Exports Twitch stream markers as CSV clips (for LosslessCut) and YouTube chapters. Also serves an OBS embed of the live topic. Next.js App Router, Clerk sign-in with Twitch OAuth, Tailwind, Vitest. No database. Hosted on Vercel.

## Facts

- Marker parsing and export logic is pure and lives in `src/utils/markers.ts`, tested in `src/utils/markers.test.ts`. Put new logic there so it stays testable. Twitch API calls live in `src/utils/twitch-server.ts`.
- Local dev needs Clerk and Twitch keys in `.env.local`. The template is `src/.env.example`.
- Vercel env vars and project settings are production. Change them only when Theo asks.

## Dependencies

`packageManager` pins pnpm 8, which reads the v6 `pnpm-lock.yaml`. A newer global pnpm switches to the pinned version on its own. Install with `pnpm install --frozen-lockfile`.

If your diff rewrites the lockfile to v9 or adds `pnpm-workspace.yaml`, the wrong pnpm ran. Revert both files.

## Screenshot fixtures

Put temporary routes for screenshots in `src/app/fixtures/<name>/page.tsx`. That folder is gitignored, so fixtures never ship. Render components with fake data instead of Twitch calls.

A deleted route leaves stale types in `.next/` that fail a bare `tsc`. Use `pnpm typecheck`: it deletes `.next/dev/types` and regenerates `.next/types` first. To clean by hand, run `rm -rf .next/types .next/dev/types`.

## Pull requests

- Before you push, run the checks in `.github/workflows/ci.yaml`.
- Merge only when the branch is up to date with `main` and CI is green on that head.
- Greptile and CodeRabbit review PRs. CodeRabbit has an hourly rate limit. When it posts a rate-limit notice, continue without its review.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
