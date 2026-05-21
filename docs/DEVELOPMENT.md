# Development

This repo is agent-first, so unused-code checks are part of the local loop.

```bash
pnpm agent:watch
pnpm audit:all
```

`pnpm agent:watch` runs TypeScript and Knip in watch mode while code is being edited. `pnpm audit:all` is the required final gate before finishing code changes.

Commits are guarded locally with `simple-git-hooks`:

```bash
pnpm exec simple-git-hooks
```

The `pre-commit` hook runs `pnpm audit:all`. Hooks can be bypassed with Git flags, so agents must still run `pnpm audit:all` before reporting code changes as complete.
