# Saleor API Investigator

The installable skills live at `skills/investigate/SKILL.md` and `skills/investigation-wrap-up/SKILL.md`.

For normal use, open a coding agent and invoke:

```text
Use $investigate to investigate this Saleor API issue: ...
```

The `investigate` skill includes a bundled CLI. It checks local configuration,
starts a case, records the intake, and provides the safe investigation tools.
It keeps its local workspace under `.saleor-investigate/` in the repository
root. When the investigation is done, the wrap-up skill finalizes `REPORT.md`.
