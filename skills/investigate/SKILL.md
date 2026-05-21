---
name: investigate
description: Use this skill when investigating Saleor API customer bug reports, especially GraphQL behavior involving orders, checkout, products, variants, users, customers, channels, shipping, tax, permissions, or plugins. The skill starts and manages a local case, uses the support-agent CLI for safe Saleor schema/docs/source/query/mutation work, keeps customer/prod read-only, and performs writes only in sandbox.
---

# Investigate Saleor API Bug

The user's prompt is the support intake. Do not ask for a case ID. Start a case, record the intake, investigate with the CLI, and produce a root-cause report.

## Start

From the `support-agent` repo root:

```bash
pnpm dev
```

Read the printed case directory. Then read:

1. `AGENTS.md`
2. `references/CASE-FILES.md`
3. `<case-dir>/SETUP.md`

Write the user intake into `<case-dir>/INFO.md` before doing live API work. Keep it compact and redact secrets.

If the current workspace is not the `support-agent` repo, locate it from the user's provided path or ask for the local path. Do not continue with live API work until the CLI repo is identified.

## File Naming

- Case Markdown artifacts use uppercase base names, for example `INFO.md`,
  `INVESTIGATION.md`, `FINDINGS.md`, `NOTES.md`, and `REPORT.md`.
- Config and machine-readable state files use kebab-case lowercase names, for
  example `manifest.json` or `case-files.json`.

## CLI Discovery

The CLI help output is the source of truth for command syntax. Do not rely on this skill for exact commands beyond startup.

Before using any tool group, run the relevant help command:

- `pnpm dev help`
- `pnpm sandbox help`
- `pnpm prod help`
- `pnpm dev help schema`
- `pnpm dev help graphql`
- `pnpm dev help query`
- `pnpm dev help mutation`
- `pnpm dev help research`

Prefer env-first commands for live GraphQL/schema work:

- `pnpm sandbox ...` for sandbox work. This prefix is intended to be whitelistable.
- `pnpm prod ...` for customer/prod reads. This prefix should require explicit approval.
- Do not pass `SALEOR_*` endpoint URLs or tokens inline; use `.env` so command-prefix approvals remain stable.

## Safety

- Customer/prod is read-only.
- Never execute GraphQL mutations or subscriptions against prod.
- Prod mutation artifacts are examples only.
- Sandbox mutations may execute directly with `pnpm sandbox mutation run <file>`.
- If any GraphQL operation fails because the configured token lacks a required
  permission or scope, record the failed artifact and ask the user to extend the
  token/scope or provide a replacement token with the named permission. Do not
  treat the permission gap as evidence about the customer issue, and do not
  continue that blocked branch with guesses.
- Use local Saleor docs/source before external web research.
- If external web research is needed, use the coding agent's native web search, not the support-agent CLI.
- Never edit or commit the Saleor source/docs repositories during an investigation.
- Docs fixes are proposal files under the case directory.

## Investigation Loop

1. Restate the narrow behavior question in `<case-dir>/INVESTIGATION.md`.
2. Use `pnpm dev help` and topic help to discover current CLI syntax.
3. Pull schemas if needed.
4. Use targeted schema lookups instead of reading the whole schema.
5. Search local docs and source for the relevant API surface.
6. Write the smallest prod query that can separate hypotheses.
7. Execute only query documents against prod, using `pnpm prod query ...`.
8. When a GraphQL operation returns `PermissionDenied`, `FORBIDDEN`, or an equivalent
   missing-permission/scope error, update `<case-dir>/INVESTIGATION.md` with:
   the artifact path, GraphQL path, required permission/scope, and the specific
   access needed from the user. Ask the user for that access before proceeding
   with the blocked investigation branch.
9. If reproduction needs a write, draft the prod mutation as a file and perform the write only in sandbox with `pnpm sandbox mutation run ...`.
10. Promote only evidence-backed conclusions to `<case-dir>/FINDINGS.md`.
11. When the work reveals a repeatable Saleor API interaction problem, improve
    the generic workflow rather than leaving it as case-local friction. Examples:
    safer endpoint normalization, schema compatibility, permission escalation
    prompts, reusable query fragments, better CLI validation, or clearer case
    templates. Keep improvements broadly applicable and separate from customer
    facts.
12. Finish by updating `<case-dir>/REPORT.md`.

For common controlled checkout/product/voucher setup, read `references/SANDBOX-FIXTURES.md` and keep generated GraphQL files in the active case.

## Final Response

Answer with:

- Likely root cause, or the strongest remaining hypothesis
- Evidence artifact paths
- What was checked in prod
- What, if anything, was reproduced in sandbox
- Customer-safe next steps
- Saleor follow-up or docs-gap proposal

If you could not run a command because configuration or credentials were missing, say exactly which env var or path is missing.
If a GraphQL operation was blocked by insufficient token permissions, say exactly which
permission/scope is needed and which evidence artifact contains the denial.
