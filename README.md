# Saleor API Investigator

A coding-agent skill for investigating Saleor API issues. It includes its own CLI for interacting with a Saleor instance through an agent-native permissions layer.

This project is for people who operate or support Saleor environments they are
authorized to access. It keeps the live environment read-only, uses a sandbox
for reproduction, and saves the evidence behind each conclusion.

The only required local path is a [saleor/saleor](https://github.com/saleor/saleor)
checkout. A local Saleor apps monorepo, a docs checkout, and Saleor environment
access are optional and can be added when the issue needs them.

## Install

```bash
npx skills add peelar/saleor-investigator
```

The installer copies only the selected skill directories. The `investigate`
skill carries a compiled CLI under `scripts/`. Node.js 20 or newer is the only
runtime requirement.

A local Saleor Core checkout is required. The skill checks its path before
starting an investigation. Local apps and docs checkouts are optional.

## How it works

Open your coding agent anywhere inside the repository where you want to run the
investigation. Then use:

```text
Use $investigate to investigate this Saleor API issue: <paste issue report>
```

The agent will:

1. Start a case.
2. Inspect the live environment with read-only GraphQL queries.
3. Reproduce writes in the sandbox when needed.
4. Check the schema and the relevant local Core, apps, and docs checkouts.
5. Produce an evidence-backed report.

The CLI keeps config, state, schemas, and cases under `.saleor-investigate/` at
the Git root. It adds that directory to Git's local exclude file without
changing the repository's tracked `.gitignore`.

## Permissions

The agent works through the bundled CLI. This is the safety boundary:

- `prod` is the live environment where the issue happened. The CLI allows
  queries, but rejects mutations and subscriptions before making a network
  request.
- `sandbox` is an isolated environment for reproducing the issue. The CLI
  allows mutations within the configured token permissions.
- The CLI can read local Saleor Core, apps, and docs checkouts, and save
  investigation files under `.saleor-investigate/`. It cannot edit those
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
