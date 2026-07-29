---
name: investigation-wrap-up
description: Use when the user says a Saleor API investigation is done, complete, finished, ready to wrap up, end it, write the report, close the case, or asks for final case reporting. Validates case artifacts, writes REPORT.md, preserves uppercase Markdown naming, lists evidence-backed findings, unresolved blockers, operator-safe next steps, and optional upstream follow-up links.
---

# Investigation Wrap-Up

Use this after an investigation has enough evidence and the user signals completion.

## Start

From anywhere inside the repository:

1. Resolve the Git root, unless `SALEOR_INVESTIGATE_DIR` names a different
   investigation root.
2. Read `.saleor-investigate/current-case.json` and identify the active case. If
   it is missing, inspect `.saleor-investigate/cases/` and ask the user only
   when more than one case could be active.
3. Read the case files: `INFO.md`, `INVESTIGATION.md`, `FINDINGS.md`, `REPORT.md`, `artifact-index.json` if present, and `manifest.json`.
4. Check naming:
   - Markdown files use uppercase base names.
   - Config/state files use kebab-case lowercase names.

## Validate

- Every confirmed finding in `FINDINGS.md` must cite an artifact path or source path.
- Every unresolved permission blocker must name the env, GraphQL path, required permission/scope, and denial artifact.
- Report exact follow-up links for PRs, docs proposals, or issues opened during the investigation.
- Keep shared text safe: do not include secrets, full live promo codes, or unnecessary PII. Link raw artifacts when exact values are needed by authorized users.

## Write `REPORT.md`

Use these sections unless a case clearly needs less:

```md
# <case-id> Report

## Summary

## Reproduction

## Evidence

## Root Cause

## Operator-Safe Next Steps

## Upstream Follow-Up

## Remaining Blockers

## Docs Gap
```

Omit `Remaining Blockers` only when there are none. Prefer artifact paths and outcomes over command transcripts.

If the harness itself blocked part of the investigation, preserve that limitation
in `REPORT.md` as an optional upstream follow-up. Do not change the harness as
part of wrapping up a case.
