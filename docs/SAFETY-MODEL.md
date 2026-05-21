# Safety Model

- `prod` and `sandbox` are separate GraphQL endpoints with separate tokens.
- Prod network execution is query-only. The CLI parses GraphQL documents and refuses mutations/subscriptions before making a request.
- Prod mutation commands only create `.graphql` draft files.
- Prod mutation runs inspect the file locally and save an inspection artifact, but never make a network request.
- Sandbox mutations execute through `pnpm sandbox mutation run ...`; `--execute` is accepted only as a compatibility no-op.
- GraphQL responses are saved with sibling `*-summary.json` files and case-local `artifact-index.json` entries.
- Case history, schemas, query files, responses, and docs proposals are plain files.
- For coding-agent approvals, whitelist `["pnpm", "sandbox"]` and keep `["pnpm", "prod"]` unapproved so customer/prod reads still require explicit acceptance.
- Store endpoint URLs and tokens in `.env`; do not pass `SALEOR_*` values inline when you want command-prefix whitelisting to work.

## Hard Rules

- Prod/customer GraphQL is read-only.
- Never execute mutations or subscriptions against prod.
- Prod mutation files are examples only.
- Prod mutation runs inspect files locally only and never make a network request.
- Sandbox mutations may execute directly with `pnpm sandbox mutation run <file>`.
- Keep `SALEOR_*` endpoint URLs and tokens in `.env`; do not pass them inline when relying on command-prefix whitelisting.
- Do not edit or commit Saleor source/docs repositories from this harness.
- Docs fixes are proposal files under the case directory.
- Case Markdown artifacts use uppercase base names, for example `INFO.md`, `FINDINGS.md`, `NOTES.md`, and `REPORT.md`.
- Config and machine-readable state files use kebab-case lowercase names, for example `manifest.json` or `case-files.json`.
