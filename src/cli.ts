#!/usr/bin/env node
import { cac, type CAC } from "cac";
import {
  initCaseCommand,
  noteCaseCommand,
  refreshCaseCommand,
  statusCaseCommand,
} from "./commands/caseCommands.js";
import { caseOption, graphqlOptions, type CaseOptionInput, type GraphqlOptionInput, required } from "./commands/cli-options.js";
import {
  createGraphqlCommand,
  draftMutationCommand,
  runMutationCommand,
  runQueryCommand,
  schemaActionCommand,
  validateGraphqlCommand,
} from "./commands/graphql-commands.js";
import {
  docsPatchProposalCommand,
  docsReadCommand,
  docsSearchCommand,
  sourceReadCommand,
  sourceSearchCommand,
} from "./commands/researchCommands.js";
import { newWorkflow, refreshWorkflow, startCase, statusWorkflow } from "./commands/workflow-commands.js";
import { parseEnvName } from "./config.js";
import { UserError } from "./errors.js";
import type { EnvName } from "./types.js";

type AsyncAction = () => Promise<void>;

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

  if (!args.length) {
    await startCase();
    return;
  }

  const [first, ...rest] = args;
  if (isEnvName(first)) {
    await runCli(buildEnvCli(first), rest);
    return;
  }

  await runCli(buildRootCli(), args);
}

async function runCli(cli: CAC, args: string[]): Promise<void> {
  cli.parse(["node", cli.name, ...args], { run: false });
  if (cli.options.help) {
    return;
  }
  if (!cli.matchedCommand) {
    const command = cli.args[0];
    if (command) {
      throw new UserError(`Unknown command: ${command}`);
    }
    cli.outputHelp();
    return;
  }
  await cli.runMatchedCommand();
}

function buildRootCli(): CAC {
  const cli = cac("pnpm dev");
  cli.usage("[command]");
  cli.help();

  registerHelp(cli);

  cli
    .command("new [caseId]", "Configure endpoint URLs for coding-agent CLI commands, then create a new case")
    .action((caseId?: string) => run(newWorkflow, caseId));
  cli.command("status [caseId]", "Show current or named case status").action((caseId?: string) => run(statusWorkflow, caseId));
  cli.command("refresh [caseId]", "Regenerate setup markdown for current or named case").action((caseId?: string) => run(refreshWorkflow, caseId));

  cli.command("case <action> [...args]", "Manage case files").action((action: string, args: string[]) =>
    run(() => runCaseAction(action, args)),
  );

  cli.command("schema <action> <env> [...args]", "Inspect or pull cached GraphQL schemas").action((action: string, envValue: string, args: string[]) =>
    run(() => schemaActionCommand(action, parseEnvName(envValue), args)),
  );

  cli
    .command("graphql-new <kind> <env> <name>", "Create a query or mutation file in the active case")
    .option("--case <caseId>", "Case ID")
    .action((kind: string, envValue: string, name: string, options: CaseOptionInput) =>
      run(() => createGraphqlCommand({ kind, env: parseEnvName(envValue), name, caseId: caseOption(options) })),
    );

  cli.command("graphql-validate <env> <file>", "Validate a GraphQL file against the cached schema").action((envValue: string, file: string) =>
    run(() => validateGraphqlCommand(parseEnvName(envValue), file)),
  );

  cli
    .command("query <env> <file>", "Execute a GraphQL query document")
    .option("--variables <path>", "JSON variables file")
    .option("--vars <path>", "Alias for --variables")
    .option("--case <caseId>", "Case ID")
    .action((envValue: string, file: string, options: GraphqlOptionInput) => {
      const parsed = graphqlOptions(options);
      return run(() => runQueryCommand({ env: parseEnvName(envValue), file, ...parsed }));
    });

  cli
    .command("mutation <action> <env> [...args]", "Create, inspect, or run mutation files")
    .option("--variables <path>", "JSON variables file")
    .option("--vars <path>", "Alias for --variables")
    .option("--case <caseId>", "Case ID")
    .option("--execute", "Compatibility no-op; sandbox runs without it and prod never executes")
    .action((action: string, envValue: string, args: string[], options: GraphqlOptionInput) =>
      run(() => runMutationAction(action, parseEnvName(envValue), args, options)),
    );

  registerResearchCommands(cli);
  return cli;
}

function buildEnvCli(env: EnvName): CAC {
  const cli = cac(`pnpm ${env}`);
  cli.usage("[command]");
  cli.help();

  registerHelp(cli);

  cli.command("schema <action> [...args]", `Inspect or pull cached ${env} GraphQL schemas`).action((action: string, args: string[]) =>
    run(() => schemaActionCommand(action, env, args)),
  );

  cli
    .command("graphql-new <kind> <name>", `Create a ${env} query or mutation file in the active case`)
    .option("--case <caseId>", "Case ID")
    .action((kind: string, name: string, options: CaseOptionInput) =>
      run(() => createGraphqlCommand({ kind, env, name, caseId: caseOption(options) })),
    );

  cli.command("graphql-validate <file>", `Validate a ${env} GraphQL file against the cached schema`).action((file: string) =>
    run(() => validateGraphqlCommand(env, file)),
  );

  cli
    .command("query <file>", `Execute a ${env} GraphQL query document`)
    .option("--variables <path>", "JSON variables file")
    .option("--vars <path>", "Alias for --variables")
    .option("--case <caseId>", "Case ID")
    .action((file: string, options: GraphqlOptionInput) => {
      const parsed = graphqlOptions(options);
      return run(() => runQueryCommand({ env, file, ...parsed }));
    });

  cli
    .command("mutation <action> [...args]", mutationCommandDescription(env))
    .option("--variables <path>", "JSON variables file")
    .option("--vars <path>", "Alias for --variables")
    .option("--case <caseId>", "Case ID")
    .option("--execute", executeOptionDescription(env))
    .action((action: string, args: string[], options: GraphqlOptionInput) => run(() => runMutationAction(action, env, args, options)));

  return cli;
}

function registerHelp(cli: CAC): void {
  cli.command("help [...topic]", "Show CLI help").action((topic: string[]) =>
    run(async () => {
      const [name] = topic;
      if (!name) {
        cli.unsetMatchedCommand();
        cli.outputHelp();
        return;
      }
      const commands = topicCommands(cli, name);
      if (!commands.length) {
        throw new UserError(`Unknown help topic: ${name}. Run: ${cli.name} help`);
      }
      for (const [index, command] of commands.entries()) {
        if (index > 0) {
          console.log("");
        }
        command.outputHelp();
      }
    }),
  );
}

function topicCommands(cli: CAC, topic: string) {
  const names =
    topic === "graphql"
      ? ["graphql-new", "graphql-validate"]
      : topic === "research"
        ? ["source", "docs"]
        : [topic];
  return names
    .map((name) => cli.commands.find((candidate) => candidate.name === name || candidate.rawName.split(" ")[0] === name))
    .filter((command) => command !== undefined);
}

function registerResearchCommands(cli: CAC): void {
  cli.command("source <action> [...args]", "Search or read the configured Saleor source checkout").action((action: string, args: string[]) =>
    run(() => runResearchAction("source", action, args)),
  );
  cli.command("docs <action> [...args]", "Search, read, or draft docs patch proposals").action((action: string, args: string[]) =>
    run(() => runResearchAction("docs", action, args)),
  );
}

async function runCaseAction(action: string, args: string[]): Promise<void> {
  if (action === "init") {
    await initCaseCommand(required(args[0], "case ID"));
    return;
  }
  if (action === "refresh") {
    await refreshCaseCommand(args[0]);
    return;
  }
  if (action === "status") {
    await statusCaseCommand(args[0]);
    return;
  }
  if (action === "note") {
    await noteCaseCommand(args[0], args.slice(1));
    return;
  }
  throw new UserError("Usage: case <init|refresh|status|note> [CASE-ID] ...");
}

async function runMutationAction(action: string, env: EnvName, args: string[], rawOptions: GraphqlOptionInput): Promise<void> {
  const options = graphqlOptions(rawOptions);
  if (action === "draft") {
    await draftMutationCommand({ env, name: required(args[0], "draft name"), caseId: options.caseId });
    return;
  }
  if (action === "run") {
    await runMutationCommand({
      env,
      file: required(args[0], "GraphQL mutation file"),
      caseId: options.caseId,
      variables: options.variables,
      execute: options.execute,
    });
    return;
  }
  throw new UserError("Usage: mutation <draft|run> <prod|sandbox> ...");
}

async function runResearchAction(kind: "source" | "docs", action: string, args: string[]): Promise<void> {
  if (kind === "source") {
    if (action === "search") {
      await sourceSearchCommand(required(args[0], "search term"));
      return;
    }
    if (action === "read") {
      await sourceReadCommand(required(args[0], "relative path"), args[1], args[2]);
      return;
    }
    throw new UserError("Usage: source <search|read> ...");
  }

  if (action === "search") {
    await docsSearchCommand(required(args[0], "search term"));
    return;
  }
  if (action === "read") {
    await docsReadCommand(required(args[0], "relative path"), args[1], args[2]);
    return;
  }
  if (action === "patch-proposal") {
    const caseId = args.length > 1 ? args[0] : undefined;
    const title = required(args.length > 1 ? args.slice(1).join(" ") : args[0], "title");
    await docsPatchProposalCommand(caseId, title);
    return;
  }
  throw new UserError("Usage: docs <search|read|patch-proposal> ...");
}

function run<T extends unknown[]>(action: (...args: T) => Promise<void>, ...args: T): Promise<void>;
function run(action: AsyncAction): Promise<void>;
function run<T extends unknown[]>(action: AsyncAction | ((...args: T) => Promise<void>), ...args: T): Promise<void> {
  return action(...args);
}

function isEnvName(value: string | undefined): value is EnvName {
  return value === "prod" || value === "sandbox";
}

function mutationCommandDescription(env: EnvName): string {
  return env === "prod"
    ? "Create or inspect prod mutation drafts without network execution"
    : "Create or run sandbox mutation files";
}

function executeOptionDescription(env: EnvName): string {
  return env === "prod"
    ? "Compatibility no-op; prod mutations are inspection-only"
    : "Compatibility no-op; no longer required for sandbox mutations";
}

main().catch((error: unknown) => {
  if (error instanceof UserError || (error instanceof Error && error.name === "CACError")) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.error(error);
  process.exitCode = 1;
});
