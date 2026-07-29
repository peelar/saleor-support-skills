# Agent Setup

The intended workflow is agent-first:

```text
Use $investigate to investigate this Saleor API issue: <paste issue report>
```

The skill checks local configuration before it starts a case, records the issue,
uses the CLI as a safe tool layer, keeps prod read-only, and writes the final
root-cause report under the case directory.

## Skills

The skills live at:

```text
skills/investigate/SKILL.md
skills/investigation-wrap-up/SKILL.md
```

They include:

```text
skills/investigate/
  SKILL.md
  agents/openai.yaml
  scripts/saleor-investigate.cjs
  references/CONFIGURATION.md
  references/CLI-TOOLS.md
  references/CASE-FILES.md
  references/SANDBOX-FIXTURES.md
skills/investigation-wrap-up/
  SKILL.md
  agents/openai.yaml
```

Install them from the repository with:

```bash
npx skills add peelar/saleor-investigator
```

Then invoke `$investigate` with the issue report as input. The wrap-up skill
triggers when an investigation is done or the user asks to write the final
report.

The rest of this page describes repository-local development setup.

For the one-time project setup:

```bash
pnpm bootstrap
```

If an older local copy exists:

```bash
pnpm bootstrap -- --force
```

## Project-Local Setup

Initialize project-local agent files for a specific coding agent:

```bash
pnpm bootstrap
pnpm bootstrap -- --agent claude-code
pnpm bootstrap -- --agent codex
pnpm bootstrap -- --agent gemini-cli
pnpm bootstrap -- --agent cursor
```

Multiple agents can be installed at once:

```bash
pnpm bootstrap -- --agent codex,claude-code,gemini-cli
pnpm bootstrap -- --agent all --force
```

Running `pnpm bootstrap` without `--agent` opens an interactive agent picker and installs project-local skills. Pass `--agent codex` for a non-interactive Codex-only setup.

Supported keys are `codex`, `claude-code`, `gemini-cli`, `windsurf`, `cursor`, `github-copilot`, `cline`, and `universal`.

Skill-native agents receive copies of the investigation skills in their native project skills directory. Agents that rely more on rules or instructions, such as Cursor, GitHub Copilot, and Cline, also receive a small adapter file that points the agent back to the canonical `skills/investigate/SKILL.md` workflow.
