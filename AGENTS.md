## Git Commit Convention

Format: `type: subject` (subject starts with lowercase, one concise sentence only)

- `feat`: New or modified feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, whitespace
- `refactor`: Code restructure
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Build tools, maintenance
- `revert`: Revert a previous commit

Examples:

- `feat: add session open/close lines toggle`
- `fix: disable fetch cache to get fresh data`
- `chore: upgrade lightweight-charts to v5`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
