# CLI Tools

The CLI help output is the source of truth for command syntax. This file exists only to tell agents how to discover commands without relying on stale skill text.

Run from the `support-agent` repo root:

```bash
pnpm dev help
pnpm sandbox help
pnpm prod help
```

Use topic help before each tool group:

```bash
pnpm dev help case
pnpm dev help schema
pnpm dev help graphql
pnpm dev help query
pnpm dev help mutation
pnpm dev help research
pnpm dev help docs
pnpm dev help source
pnpm sandbox help schema
pnpm sandbox help graphql
pnpm sandbox help query
pnpm sandbox help mutation
pnpm prod help schema
pnpm prod help graphql
pnpm prod help query
pnpm prod help mutation
```

Prefer env-first commands for live GraphQL/schema work. `pnpm sandbox ...` is intended to be whitelistable as `["pnpm", "sandbox"]`; `pnpm prod ...` should require explicit approval. Keep `SALEOR_*` endpoint URLs and tokens in `.env` instead of passing them inline.

There is no CLI web-search tool. Use the coding agent's native web search when external research is needed, then summarize relevant links or findings in the case notes/report.
