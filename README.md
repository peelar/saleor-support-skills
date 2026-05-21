# Saleor Support Agent Harness

Local CLI plus installable coding-agent skills for API-only Saleor support investigations.

## Purpose

This tool helps support agents investigate Saleor API bug reports in a consistent way. It keeps customer data safe, separates read-only production checks from sandbox testing, and helps collect the evidence needed to explain what happened.

It is meant for investigations that require more than a quick answer: checking customer data, reproducing behavior safely, reading Saleor docs and source code to confirm behavior, and preparing a clear final report.

## Run It

Install dependencies and configure endpoints:

```bash
pnpm install
cp .env.example .env
pnpm dev start
```

Use the agent-first flow for real investigations:

```text
Use $investigate to investigate this Saleor API bug report: <paste customer report>
```

## Prod And Sandbox Envs

`prod` is the customer or production Saleor environment. It is for read-only discovery: schemas, queries, and local inspection of mutation files.

`sandbox` is the controlled reproduction environment. Use it for writes, setup, checkout flows, and mutation execution while testing a hypothesis.

Keep `SALEOR_*` URLs and tokens in `.env`, then choose the target explicitly with `pnpm prod ...` or `pnpm sandbox ...`.

For manual CLI use:

```bash
pnpm dev
pnpm dev status
pnpm prod schema pull
pnpm sandbox mutation run cases/<case-id>/sandbox/mutations/reproduce.graphql
```

The CLI help output is the source of truth for command syntax:

```bash
pnpm dev help
pnpm prod help
pnpm sandbox help
```

## Docs

- [Agent setup](docs/AGENT-SETUP.md) explains the installable skills and project-local agent files.
- [CLI reference](docs/CLI-REFERENCE.md) lists the manual commands and generated case layout.
- [Safety model](docs/SAFETY-MODEL.md) documents the prod/sandbox rules and GraphQL execution boundaries.
- [Development](docs/DEVELOPMENT.md) covers local checks, watch mode, and commit hooks.
