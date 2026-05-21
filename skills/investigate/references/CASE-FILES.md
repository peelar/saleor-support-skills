# Case Files

Each case is a plain directory under `cases/<case-id>/`.

## Intake

Write the user's prompt into `INFO.md` in this shape:

```md
# <case-id> Info

## Customer Report

## Affected API Surface

## Known IDs and Redactions

## Expected Behavior

## Actual Behavior

## Environment Notes

## Saleor-Specific Context
```

Keep PII and secrets out of human-facing Markdown unless a field is directly relevant. Raw API artifacts may contain exact evidence when needed for authorized review, but reports should prefer IDs, redacted snippets, and artifact paths. Never write tokens or secrets. For live voucher/promo codes, prefer campaign name/type plus the final few characters unless the exact value is required.

## Working Notes

Use `INVESTIGATION.md` for the active reasoning trail:

- Question being tested
- Schema notes
- Docs notes
- Source notes
- Prod query evidence
- Sandbox reproduction
- Hypotheses

Use `FINDINGS.md` only for conclusions backed by evidence.

## Artifacts

Expected folders:

```text
prod/queries/
prod/responses/
prod/drafted-mutations/
sandbox/queries/
sandbox/mutations/
sandbox/responses/
docs/
artifacts/
```

Case runs also maintain `artifact-index.json` when GraphQL commands save responses. Use it to find response paths, summary paths, outcomes, and permission blockers.

Prefer linking these paths in the final answer over pasting large JSON.

## Report

Finish in `REPORT.md`:

```md
# <case-id> Report

## Summary

## Reproduction

## Evidence

## Root Cause

## Customer-Safe Next Steps

## Suggested Saleor Follow-Up

## Docs Gap
```
