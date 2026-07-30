# Agent Setup

The intended workflow is agent-first:

```text
Use $investigate to investigate this Saleor API issue: <paste issue report>
```

The skill checks local configuration before it starts a case, records the issue,
uses the CLI as a safe tool layer, keeps prod read-only, and writes the final
root-cause report under the case directory.

## Skill

The skill lives at:

```text
skills/investigate/SKILL.md
```

It includes:

```text
skills/investigate/
  SKILL.md
  agents/openai.yaml
  scripts/saleor-investigate.cjs
  references/CONFIGURATION.md
  references/CLI-TOOLS.md
  references/CASE-FILES.md
  references/SANDBOX-FIXTURES.md
```

Install it from the repository with:

```bash
npx skills add peelar/saleor-investigator
```

Then invoke `$investigate` with the issue report as input. The same skill
resumes the active case when the user says the investigation is done or asks
for the final report.

## Investigation Paths

Only the Saleor Core checkout is required. Put its path and any optional local
checkouts in `.saleor-investigate/config.env`:

```dotenv
SALEOR_SOURCE_DIR=/absolute/path/to/saleor
SALEOR_APPS_DIR=/absolute/path/to/apps-monorepo
SALEOR_DOCS_DIR=/absolute/path/to/saleor-docs
```

`SALEOR_APPS_DIR` helps with apps-related troubleshooting.
`SALEOR_DOCS_DIR` helps with local documentation research. Both are optional.

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

Skill-native agents receive a copy of the investigation skill in their native project skills directory. Agents that rely more on rules or instructions, such as Cursor, GitHub Copilot, and Cline, also receive a small adapter file that points the agent back to the canonical `skills/investigate/SKILL.md` workflow.
