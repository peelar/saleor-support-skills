# CLI Tools

The CLI help output is the source of truth for command syntax. This file exists only to tell agents how to discover commands without relying on stale skill text.

Locate the directory containing the parent skill's `SKILL.md`. Replace `<CLI>`
below with:

```bash
node "<skill-directory>/scripts/saleor-investigate.cjs"
```

Run from anywhere inside the repository. The CLI resolves the Git root and
stores local data under `.saleor-investigate/`:

```bash
<CLI> help
<CLI> config check
<CLI> sandbox help
<CLI> prod help
```

Use topic help before each tool group:

```bash
<CLI> help case
<CLI> help schema
<CLI> help graphql
<CLI> help query
<CLI> help mutation
<CLI> help research
<CLI> help apps
<CLI> help docs
<CLI> help source
<CLI> sandbox help schema
<CLI> sandbox help graphql
<CLI> sandbox help query
<CLI> sandbox help mutation
<CLI> prod help schema
<CLI> prod help graphql
<CLI> prod help query
<CLI> prod help mutation
```

Prefer env-first commands for live GraphQL/schema work. The `<CLI> sandbox`
prefix may be whitelisted. Keep `<CLI> prod` approval-gated. Keep `SALEOR_*`
endpoint URLs and tokens in `.saleor-investigate/config.env` instead of passing
them inline.

There is no CLI web-search tool. Use the coding agent's native web search when external research is needed, then summarize relevant links or findings in the case notes/report.
