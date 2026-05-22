# Saleor Support Agent

Local CLI plus installable coding-agent skills for API-only Saleor support investigations.

## Purpose

This tool helps support agents investigate Saleor API bug reports in a consistent way. It keeps customer data safe, separates read-only production checks from sandbox testing, and helps collect the evidence needed to explain what happened.

It is meant for investigations that require more than a quick answer: checking customer data, reproducing behavior safely, reading Saleor docs and source code to confirm behavior, and preparing a clear final report.

## Run It

### Initial Setup

Install dependencies:

```bash
pnpm install
```

Install project-local agent files for a specific coding agent:

```bash
pnpm bootstrap
```

Configure the endpoint URLs used by the agent commands and create a case:

```bash
cp .env.example .env
pnpm dev new
```

### Prod vs. Sandbox

Support Agent harness distinguishes between `prod` and `sandbox` environments.

`prod` is where the issue was found. The agent can't execute mutations on `prod`; it can at best write a draft of them and present to the user. It can query resources according to the token permissions.

`sandbox` is where the agent tries to reproduce the issue. It's meant to be a safe dev instance (e.g., an empty Cloud sandbox) where the agent can perform mutations freely. Allowed operations are scoped by token permissions as well as the harness permissions.

> [!TIP]
> I recommend whitelisting the term `pnpm sandbox` so you are not asked for permission anytime the agent tries to do something in the sandbox.

### Usage

Use the agent-first flow for real investigations:

```text
Use $investigate to investigate this Saleor API bug report: <paste customer report>
```

The agent will then:

1. Start a case
2. Investigate the issue on the `prod` environment
3. Recreate it on the `sandbox` environment
4. Read docs or source code to find the root cause (or write a PR to docs if found behavior doesn't match them)
5. Produce a root-cause report

To communicate with Saleor GraphQL API, the agent will use a CLI. It encapsulates the query/mutation logic as well as the different set of rules for operating on `prod` and `sandbox` environments. It's not meant to be used by the user, just the agent.
