# Saleor Support Agent Harness

Local CLI plus an installable coding-agent skill for API-only Saleor support investigations.

The intended flow is agent-first:

```text
Use $investigate to investigate this Saleor API bug report: <paste customer report>
```

The skill starts a case, records the intake, uses the CLI as a safe tool layer, keeps prod read-only, and writes the final root-cause report under the case directory.

The CLI help command is the source of truth for command syntax:

```bash
pnpm dev help
pnpm sandbox help
pnpm prod help
pnpm dev help schema
pnpm dev help mutation
```

## Skill

The skills live at:

```text
skills/investigate/SKILL.md
skills/investigation-wrap-up/SKILL.md
```

It includes:

```text
skills/investigate/
  SKILL.md
  agents/openai.yaml
  references/CLI-TOOLS.md
  references/CASE-FILES.md
  references/SANDBOX-FIXTURES.md
skills/investigation-wrap-up/
  SKILL.md
  agents/openai.yaml
```

To use them in an agent that supports local skills, install or point the agent at `skills/`, then invoke `$investigate` with the bug report as input. The wrap-up skill triggers when an investigation is done or the user asks to write the final report.

For the original Codex global install:

```bash
pnpm skill:install
```

If an older local copy exists:

```bash
pnpm skill:install -- --force
```

To initialize project-local agent files for a specific coding agent:

```bash
pnpm bootstrap
pnpm bootstrap -- --agent claude-code
pnpm bootstrap -- --agent codex
pnpm bootstrap -- --agent gemini-cli
pnpm bootstrap -- --agent cursor
```

Multiple agents can be installed at once:

```bash
pnpm bootstrap -- --agent codex,claude-code,gemini-cli
pnpm bootstrap -- --agent all --force
```

Running `pnpm bootstrap` without `--agent` opens a terminal multi-select picker.

Supported keys are `codex`, `claude-code`, `gemini-cli`, `windsurf`, `cursor`, `github-copilot`, `cline`, and `universal`.

Skill-native agents receive copies of the support skills in their native project skills directory. Agents that rely more on rules or instructions, such as Cursor, GitHub Copilot, and Cline, also receive a small adapter file that points the agent back to the canonical `skills/investigate/SKILL.md` workflow.

## Setup

```bash
pnpm install
cp .env.example .env
```

Configure:

```env
SALEOR_PROD_API_URL=https://customer.example.com/graphql/
SALEOR_PROD_TOKEN=

SALEOR_SANDBOX_API_URL=https://sandbox.example.com/graphql/
SALEOR_SANDBOX_TOKEN=

SALEOR_SOURCE_DIR=/Users/adrianpilarczyk/Code/saleor/saleor
SALEOR_DOCS_DIR=/Users/adrianpilarczyk/Code/saleor/saleor-docs
```

Endpoint URLs must point at Saleor GraphQL endpoints and include `/graphql/`.

To configure or validate the endpoint env vars interactively:

```bash
pnpm dev start
```

## Local Code Hygiene

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

## Safety Model

- `prod` and `sandbox` are separate GraphQL endpoints with separate tokens.
- Prod network execution is query-only. The CLI parses GraphQL documents and refuses mutations/subscriptions before making a request.
- Prod mutation commands only create `.graphql` draft files.
- Prod mutation runs inspect the file locally and save an inspection artifact, but never make a network request.
- Sandbox mutations execute through `pnpm sandbox mutation run ...`; `--execute` is accepted only as a compatibility no-op.
- GraphQL responses are saved with sibling `*-summary.json` files and case-local `artifact-index.json` entries.
- Case history, schemas, query files, responses, and docs proposals are plain files.
- For coding-agent approvals, whitelist `["pnpm", "sandbox"]` and keep `["pnpm", "prod"]` unapproved so customer/prod reads still require explicit acceptance.
- Store endpoint URLs and tokens in `.env`; do not pass `SALEOR_*` values inline when you want command-prefix whitelisting to work.

## Manual CLI

The skill normally runs env-first commands for the agent. The older `pnpm dev ...` commands remain available for compatibility and debugging.

Start a case:

```bash
pnpm dev
```

Inspect the active case:

```bash
pnpm dev status
```

Schema tools:

```bash
pnpm prod schema pull
pnpm prod schema find Order
pnpm prod schema query order
pnpm sandbox schema mutation orderUpdate
pnpm prod schema field Order fulfillments
pnpm sandbox schema input OrderUpdateInput
```

Query tools:

```bash
pnpm prod graphql-new query order-debug
pnpm prod graphql-validate cases/<case-id>/prod/queries/order-debug.graphql
pnpm prod query cases/<case-id>/prod/queries/order-debug.graphql
```

Mutation tools:

```bash
pnpm prod mutation draft order-update-example
pnpm sandbox graphql-new mutation reproduce-order-update
pnpm sandbox mutation run cases/<case-id>/sandbox/mutations/reproduce-order-update.graphql
```

This is inspection-only and never executes against prod:

```bash
pnpm prod mutation run any.graphql
```

Research tools:

```bash
pnpm dev source search "checkoutComplete"
pnpm dev docs search "orderUpdate"
pnpm dev docs patch-proposal "Clarify checkout completion errors"
```

There is no CLI web-search dependency. Agents should use their native web search when external research is needed.

Compatibility examples:

```bash
pnpm dev schema pull prod
pnpm dev query prod cases/<case-id>/prod/queries/order-debug.graphql
pnpm dev mutation run sandbox cases/<case-id>/sandbox/mutations/reproduce-order-update.graphql
```

## Case Output

Naming convention:

- Case Markdown files use uppercase base names, for example `REPORT.md`.
- Config and machine-readable state files use kebab-case lowercase names, for example `manifest.json`.

Generated case layout:

```text
cases/<case-id>/
  prod/queries/
  prod/responses/
  prod/drafted-mutations/
  sandbox/queries/
  sandbox/mutations/
  sandbox/responses/
  docs/
  artifacts/
  SETUP.md
  INFO.md
  INVESTIGATION.md
  FINDINGS.md
  NOTES.md
  REPORT.md
  artifact-index.json
  manifest.json
```
