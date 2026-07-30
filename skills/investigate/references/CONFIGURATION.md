# Configuration

The bundled CLI reads `.saleor-investigate/config.env` from the repository root.
It finds that root from the nearest Git checkout, so commands may run from a
subdirectory. Keep the config outside the installed skill so skill updates
cannot replace it.

On its first non-help command, the CLI creates `.saleor-investigate/` with
private directory permissions where supported. In a Git checkout it also adds
the directory to `.git/info/exclude`. This is local protection and does not
modify the repository's tracked `.gitignore`.

Start with:

```dotenv
# Required local checkout
SALEOR_SOURCE_DIR=/absolute/path/to/saleor

# Optional local checkouts
SALEOR_APPS_DIR=/absolute/path/to/apps-monorepo
SALEOR_DOCS_DIR=/absolute/path/to/saleor-docs

# Optional environment access
SALEOR_PROD_API_URL=https://live.example.com/graphql/
SALEOR_PROD_TOKEN=

SALEOR_SANDBOX_API_URL=https://sandbox.example.com/graphql/
SALEOR_SANDBOX_TOKEN=
```

Only `SALEOR_SOURCE_DIR` is required. It must point to a Saleor Core checkout.
`SALEOR_APPS_DIR` is optional and may point to the local Saleor apps monorepo
for apps-related troubleshooting. `SALEOR_DOCS_DIR` is also optional. All paths
may be absolute or relative to the repository root.

API endpoints and tokens are optional until a command needs that environment.
Never put tokens in `SKILL.md`, command arguments, case Markdown, or source
control.

Set `SALEOR_INVESTIGATE_DIR=/absolute/or/relative/path` in the process
environment when a monorepo needs a different investigation root. This variable
must be set before the CLI starts because it determines where `config.env` is
loaded from.
