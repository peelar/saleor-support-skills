---
name: investigation-wrap-up
description: Use when the user says a Saleor support investigation is done, complete, finished, ready to wrap up, end it, write the report, close the case, or asks for final case reporting. Validates case artifacts, writes REPORT.md, preserves uppercase Markdown naming, lists evidence-backed findings, unresolved blockers, customer-safe next steps, and follow-up PR/docs links.
---

# Investigation Wrap-Up

Use this after an investigation has enough evidence and the user signals completion.

## Start

From the `support-agent` repo root:

1. Run `pnpm dev status` and identify the active case.
2. Read the case files: `INFO.md`, `INVESTIGATION.md`, `FINDINGS.md`, `REPORT.md`, `artifact-index.json` if present, and `manifest.json`.
3. Check naming:
   - Markdown files use uppercase base names.
   - Config/state files use kebab-case lowercase names.

## Validate

- Every confirmed finding in `FINDINGS.md` must cite an artifact path or source path.
- Every unresolved permission blocker must name the env, GraphQL path, required permission/scope, and denial artifact.
- Report exact follow-up links for PRs, docs proposals, or issues opened during the investigation.
- Keep customer-facing text safe: do not include secrets, full live promo codes, or unnecessary PII. Link raw artifacts when exact values are needed by authorized reviewers.

## Write `REPORT.md`

Use these sections unless a case clearly needs less:

```md
# <case-id> Report

## Summary

## Reproduction

## Evidence

## Root Cause

## Customer-Safe Next Steps

## Suggested Saleor Follow-Up

## Remaining Blockers

## Docs Gap
```

Omit `Remaining Blockers` only when there are none. Prefer artifact paths and outcomes over command transcripts.

## Generic Improvement Loop

Before final response, record any reusable harness friction that should become a generic improvement. If an improvement was already implemented, mention the changed behavior in `REPORT.md`.
