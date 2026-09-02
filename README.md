# Saleor Support Skills

Coding-agent skills for investigating Saleor API issues and creating disposable
Saleor environments.

This project is for people who operate or support Saleor environments they are
authorized to access. The investigation workflow keeps live environments
read-only and saves the evidence behind each conclusion. Saleor Yard provides
disposable environments for safe reproduction work.

## Install

```bash
npx skills add peelar/saleor-support-skills
```

This installs two skills:

- `investigate` manages evidence-backed Saleor API investigations and carries a
  compiled CLI under `scripts/`.
- `saleor-yard` teaches the agent to create and control disposable Saleor
  environments through the live Saleor Yard CLI.

Node.js 20 or newer and a local
[saleor/saleor](https://github.com/saleor/saleor) checkout are required by the
investigation skill. A local docs checkout is optional. The Yard skill expects
the `saleor-yard` CLI to be available and reads its live help before acting.

## Investigate an issue

Open your coding agent anywhere inside the repository where you want to run the
investigation. Then use:

```text
Use $investigate to investigate this Saleor API issue: <paste issue report>
```

The agent will:

1. Start a case.
2. Inspect the live environment with read-only GraphQL queries.
3. Reproduce writes in the sandbox when needed.
4. Check the schema, Saleor source, and docs.
5. Produce an evidence-backed report.

The CLI keeps config, state, schemas, and cases under `.saleor-investigate/` at
the Git root. It adds that directory to Git's local exclude file without
changing the repository's tracked `.gitignore`.

## Create a disposable environment

Ask the agent to use Yard with the Saleor source you want to test:

```text
Use $saleor-yard to create a disposable environment for Saleor 3.21.
```

The agent discovers the installed CLI instead of relying on copied command
syntax. It checks the provider, waits for Yard's ready state, keeps the exact
environment ID and resolved Saleor commit, and deletes the environment after
the work unless you ask to keep it.

## Permissions

The investigation agent works through its bundled CLI. This is its safety
boundary:

- `prod` is the live environment where the issue happened. The CLI allows
  queries, but rejects mutations and subscriptions before making a network
  request.
- `sandbox` is an isolated environment for reproducing the issue. The CLI
  allows mutations within the configured token permissions.
- The CLI can read local Saleor source and docs, and save investigation files
  under `.saleor-investigate/`. It cannot edit those source or docs
  repositories. Docs fixes are saved as proposals inside the case.

Keep endpoints and tokens in `.saleor-investigate/config.env`. Never commit
case files, API responses, tokens, or unnecessary personal data.

See [CLI reference](docs/CLI-REFERENCE.md), [agent setup](docs/AGENT-SETUP.md),
and the full [safety model](docs/SAFETY-MODEL.md).

## Development

```bash
pnpm install
mkdir -p .saleor-investigate
cp config.example.env .saleor-investigate/config.env
pnpm hooks:install
pnpm agent:watch
pnpm audit:all
```

Build the CLI carried by the skill with:

```bash
pnpm build:skill-cli
```

`pnpm audit:all` checks that the committed bundle matches the TypeScript source.
