# CLI Reference

The installed skill runs its bundled CLI with:

```bash
node "<skill-directory>/scripts/saleor-investigate.cjs"
```

The `pnpm` commands below are repository-local development aliases for that
same CLI.

The CLI help command is the source of truth for command syntax:

```bash
pnpm dev help
pnpm sandbox help
pnpm prod help
pnpm dev help schema
pnpm dev help mutation
```

## Setup

```bash
pnpm install
mkdir -p .saleor-investigate
cp config.example.env .saleor-investigate/config.env
```

Configure:

```env
SALEOR_PROD_API_URL=https://live.example.com/graphql/
SALEOR_PROD_TOKEN=

SALEOR_SANDBOX_API_URL=https://sandbox.example.com/graphql/
SALEOR_SANDBOX_TOKEN=

SALEOR_SOURCE_DIR=../saleor
SALEOR_DOCS_DIR=../saleor-docs
```

Endpoint URLs must point at Saleor GraphQL endpoints and include `/graphql/`. This config belongs to the local investigation CLI, not a Saleor app.

To configure or validate the coding-agent endpoint URLs interactively:

```bash
pnpm dev new
```

To check all investigation configuration without starting a case:

```bash
pnpm dev config check
```

The CLI resolves the nearest Git root and loads
`.saleor-investigate/config.env` from there. Set `SALEOR_INVESTIGATE_DIR` in the
process environment to use a different root.

This requires a Saleor Core checkout at `SALEOR_SOURCE_DIR`. API endpoints and
`SALEOR_DOCS_DIR` are optional at this stage, but they are validated when
configured. Individual live commands still require their matching endpoint.
Tokens are never printed.

## Case Commands

Start a case:

```bash
pnpm dev
```

Inspect the active case:

```bash
pnpm dev status
```

## Schema Tools

```bash
pnpm prod schema pull
pnpm prod schema find Order
pnpm prod schema query order
pnpm sandbox schema mutation orderUpdate
pnpm prod schema field Order fulfillments
pnpm sandbox schema input OrderUpdateInput
```

## Query Tools

```bash
pnpm prod graphql-new query order-debug
pnpm prod graphql-validate .saleor-investigate/cases/<case-id>/prod/queries/order-debug.graphql
pnpm prod query .saleor-investigate/cases/<case-id>/prod/queries/order-debug.graphql
```

## Mutation Tools

```bash
pnpm prod mutation draft order-update-example
pnpm sandbox graphql-new mutation reproduce-order-update
pnpm sandbox mutation run .saleor-investigate/cases/<case-id>/sandbox/mutations/reproduce-order-update.graphql
```

This is inspection-only and never executes against prod:

```bash
pnpm prod mutation run any.graphql
```

## Research Tools

```bash
pnpm dev source search "checkoutComplete"
pnpm dev docs search "orderUpdate"
pnpm dev docs patch-proposal "Clarify checkout completion errors"
```

There is no CLI web-search dependency. Agents should use their native web search when external research is needed.

## Compatibility Examples

```bash
pnpm dev schema pull prod
pnpm dev query prod .saleor-investigate/cases/<case-id>/prod/queries/order-debug.graphql
pnpm dev mutation run sandbox .saleor-investigate/cases/<case-id>/sandbox/mutations/reproduce-order-update.graphql
```

## Case Output

Naming convention:

- Case Markdown files use uppercase base names, for example `REPORT.md`.
- Config and machine-readable state files use kebab-case lowercase names, for example `manifest.json`.

Generated case layout:

```text
.saleor-investigate/cases/<case-id>/
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
