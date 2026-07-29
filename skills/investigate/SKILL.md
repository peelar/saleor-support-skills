---
name: investigate
description: Use this skill when investigating Saleor API issues, especially GraphQL behavior involving orders, checkout, products, variants, users, customers, channels, shipping, tax, permissions, or plugins. The skill starts and manages a local case, uses its bundled CLI for Saleor schema/docs/source/query/mutation work, keeps prod/live read-only, and performs writes only in sandbox.
---

# Investigate Saleor API Issue

The user's prompt is the issue intake. Do not ask for a case ID. Start a case, record the intake, investigate with the CLI, and produce a root-cause report.

## Start

Locate the directory containing this `SKILL.md`. The bundled CLI is:

```bash
node "<skill-directory>/scripts/saleor-investigate.cjs"
```

In the commands below, replace `<CLI>` with that full command. Run it anywhere
inside the repository being investigated. The CLI uses the Git root by default
and keeps config, state, schemas, and cases under `.saleor-investigate/`. Set
`SALEOR_INVESTIGATE_DIR` only when the user wants a different root. Do not look
for a separate CLI repository.

First run:

```bash
<CLI> config check
```

This checks the required Saleor Core checkout, the optional docs checkout, and
any configured API endpoints without printing tokens. If it fails, read
`references/CONFIGURATION.md`, tell the user exactly what is missing, and stop.
Do not create a case or perform live API work until it passes.

Then start the case:

```bash
<CLI>
```

Read the printed case directory. Then read:

1. `references/CASE-FILES.md`
2. `<case-dir>/SETUP.md`

Write the user intake into `<case-dir>/INFO.md` before doing live API work. Keep it compact and redact secrets.

## File Naming

- Case Markdown artifacts use uppercase base names, for example `INFO.md`,
  `INVESTIGATION.md`, `FINDINGS.md`, `NOTES.md`, and `REPORT.md`.
- Config and machine-readable state files use kebab-case lowercase names, for
  example `manifest.json` or `case-files.json`.

## CLI Discovery

The CLI help output is the source of truth for command syntax. Do not rely on this skill for exact commands beyond startup.

Before using any tool group, run the relevant help command:

- `<CLI> help`
- `<CLI> help config`
- `<CLI> sandbox help`
- `<CLI> prod help`
- `<CLI> help schema`
- `<CLI> help graphql`
- `<CLI> help query`
- `<CLI> help mutation`
- `<CLI> help research`

Prefer env-first commands for live GraphQL/schema work:

- `<CLI> sandbox ...` for sandbox work. This command prefix may be whitelisted.
- `<CLI> prod ...` for live reads. Keep this command prefix approval-gated.
- Do not pass `SALEOR_*` endpoint URLs or tokens inline; use
  `.saleor-investigate/config.env` so command-prefix approvals remain stable.

## Safety

- Prod/live is read-only.
- Never execute GraphQL mutations or subscriptions against prod.
- Prod mutation artifacts are examples only.
- Sandbox mutations may execute directly with `<CLI> sandbox mutation run <file>`.
- If any GraphQL operation fails because the configured token lacks a required
  permission or scope, record the failed artifact and ask the user to extend the
  token/scope or provide a replacement token with the named permission. Do not
  treat the permission gap as evidence about the reported issue, and do not
  continue that blocked branch with guesses.
- Use local Saleor docs/source before external web research.
- If external web research is needed, use the coding agent's native web search, not this CLI.
- Never edit or commit the Saleor source/docs repositories during an investigation.
- Docs fixes are proposal files under the case directory.

## Investigation Loop

1. Restate the narrow behavior question in `<case-dir>/INVESTIGATION.md`.
2. Use `<CLI> help` and topic help to discover current CLI syntax.
3. Pull schemas if needed.
4. Use targeted schema lookups instead of reading the whole schema.
5. Search local docs and source for the relevant API surface.
6. Write the smallest prod query that can separate hypotheses.
7. Execute only query documents against prod, using `<CLI> prod query ...`.
8. When a GraphQL operation returns `PermissionDenied`, `FORBIDDEN`, or an equivalent
   missing-permission/scope error, update `<case-dir>/INVESTIGATION.md` with:
   the artifact path, GraphQL path, required permission/scope, and the specific
   access needed from the user. Ask the user for that access before proceeding
   with the blocked investigation branch.
9. If reproduction needs a write, draft the prod mutation as a file and perform the write only in sandbox with `<CLI> sandbox mutation run ...`.
10. Promote only evidence-backed conclusions to `<case-dir>/FINDINGS.md`.
11. If a limitation in the harness blocks the investigation, record it in
    `<case-dir>/NOTES.md` and include it as an optional upstream follow-up.
12. Finish by updating `<case-dir>/REPORT.md`.

For common controlled checkout/product/voucher setup, read `references/SANDBOX-FIXTURES.md` and keep generated GraphQL files in the active case.

## Final Response

Answer with:

- Likely root cause, or the strongest remaining hypothesis
- Evidence artifact paths
- What was checked in prod
- What, if anything, was reproduced in sandbox
- Operator-safe next steps
- Optional upstream follow-up or docs-gap proposal

If you could not run a command because configuration or credentials were missing, say exactly which env var or path is missing.
If a GraphQL operation was blocked by insufficient token permissions, say exactly which
permission/scope is needed and which evidence artifact contains the denial.
