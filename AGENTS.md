# Agent Instructions

This repo is a local Saleor API investigation harness. The installable skill is `skills/investigate/SKILL.md`.

Normal use is agent-first: invoke `$investigate` with the issue report as input. The skill starts a case with `pnpm dev`, writes the intake into the case files, and uses the CLI as its safe tool layer.

Prefer env-first commands for live GraphQL work: `pnpm sandbox ...` and `pnpm prod ...`. The sandbox prefix can be whitelisted as `["pnpm", "sandbox"]`; do not whitelist `["pnpm", "prod"]`.

Manual use: run `pnpm dev` to create a case with a generated ID. Case files live under `.saleor-investigate/cases/<case-id>/`. Use `pnpm dev status` to inspect the active case.

Local code hygiene:

- For non-trivial code edits, start `pnpm agent:watch` when practical so TypeScript and Knip report unused code while you work.
- Before finishing any code-change task, run `pnpm audit:all`.
- Do not leave unused files, exports, imports, locals, parameters, or dependencies. If a false positive is intentional, document the narrow Knip exception in config instead of weakening the audit.
- Commits are guarded by the local `pre-commit` hook, which runs `pnpm audit:all`.

Hard rules:

- Prod/live GraphQL is read-only.
- Never execute mutations or subscriptions against prod.
- Prod mutation files are examples only.
- Prod mutation runs inspect files locally only and never make a network request.
- Sandbox mutations may execute directly with `pnpm sandbox mutation run <file>`.
- Keep `SALEOR_*` endpoint URLs and tokens in `.saleor-investigate/config.env`; do not pass them inline when relying on command-prefix whitelisting.
- Do not edit or commit Saleor source/docs repositories from this harness.
- Docs fixes are proposal files under the case directory.
- Case Markdown artifacts use uppercase base names, for example `INFO.md`, `FINDINGS.md`, `NOTES.md`, and `REPORT.md`.
- Config and machine-readable state files use kebab-case lowercase names, for example `manifest.json` or `case-files.json`.
