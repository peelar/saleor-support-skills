# Saleor Support Agent Harness

Local CLI plus installable coding-agent skills for API-only Saleor support investigations.

## Purpose

This tool gives support agents a repeatable, file-backed workflow for investigating Saleor API bug reports. It starts a case directory, records the intake, keeps customer/prod GraphQL access read-only, gives the agent safe commands for schema/query/mutation work, and collects the evidence needed for a final root-cause report.

It solves the common support problem where an investigation spans customer data, sandbox reproduction, Saleor source/docs research, draft fixes, and final reporting. Instead of scattering that work across chat history and ad hoc commands, the harness keeps it under `cases/<case-id>/` with explicit safety boundaries.

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
