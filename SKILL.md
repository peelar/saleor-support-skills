# Saleor Support Harness

The installable skills live at `skills/investigate/SKILL.md` and `skills/investigation-wrap-up/SKILL.md`.

For normal use, open a coding agent and invoke:

```text
Use $investigate to investigate this Saleor API bug report: ...
```

The skill starts a case with `pnpm dev`, records the intake, and uses the CLI tools under this repo.
When the investigation is done, the wrap-up skill finalizes `REPORT.md`.
