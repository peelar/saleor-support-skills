import path from "node:path";
import { currentCaseId, requireCaseId } from "../cases.js";
import { appConfig, envConfig } from "../config.js";
import { requestGraphql, requestGraphqlWithConfig, type GraphqlResponse } from "../client.js";
import { UserError } from "../errors.js";
import { cliInvocation } from "../invocation.js";
import {
  assertContainsMutation,
  assertOnlyQueries,
  compatibilityIntrospectionQuery,
  introspectionQuery,
  loadSchemaIndex,
  operationKinds,
  saveIntrospectionSchema,
  validateDocument,
} from "../graphql.js";
import { appendArtifactIndex } from "../artifacts.js";
import { printGraphqlResponseSummary, summarizeGraphqlResponse } from "../response-summary.js";
import {
  caseEnvDir,
  ensureDir,
  pathExists,
  readJson,
  readText,
  resolveFromCwd,
  schemaPath,
  timestampSlug,
  writeJson,
  writeText,
} from "../fs.js";
import type { EnvName, OperationKind, SchemaIndex } from "../types.js";
import { required } from "./cli-options.js";

export async function schemaActionCommand(action: string, env: EnvName, args: string[]): Promise<void> {
  if (action === "pull") {
    const config = envConfig(env);
    const { response, mode } = await introspectWithFallback(config);
    if (response.errors?.length) {
      throw new UserError(`Schema introspection returned errors: ${JSON.stringify(response.errors, null, 2)}`);
    }
    if (!response.data) {
      throw new UserError("Schema introspection returned no data");
    }
    await saveIntrospectionSchema(env, config.apiUrl, response.data as never);
    console.log(`Saved ${env} schema to ${schemaPath(env, "schema.graphql")} (${mode} introspection)`);
    return;
  }

  if (action === "find") {
    const term = required(args[0], "search term");
    const index = await loadSchemaIndex(env);
    printSchemaFind(index, term);
    return;
  }

  if (action === "field") {
    const typeName = required(args[0], "type name");
    const fieldName = required(args[1], "field name");
    const index = await loadSchemaIndex(env);
    const type = index.types[typeName];
    const field = type?.fields?.[fieldName];
    if (!field) {
      throw new UserError(`No field ${typeName}.${fieldName} found in cached ${env} schema`);
    }
    console.log(JSON.stringify({ [fieldName]: field }, null, 2));
    return;
  }

  if (action === "mutation") {
    const mutationName = required(args[0], "mutation name");
    const index = await loadSchemaIndex(env);
    printRootField(index, "mutationType", mutationName);
    return;
  }

  if (action === "query") {
    const queryName = required(args[0], "query name");
    const index = await loadSchemaIndex(env);
    printRootField(index, "queryType", queryName);
    return;
  }

  if (action === "input") {
    const inputName = required(args[0], "input object name");
    const index = await loadSchemaIndex(env);
    const type = index.types[inputName];
    if (!type?.inputFields) {
      throw new UserError(`No input object ${inputName} found in cached ${env} schema`);
    }
    console.log(JSON.stringify({ [inputName]: type }, null, 2));
    return;
  }

  throw new UserError("Usage: schema <pull|find|field|mutation|query|input> <prod|sandbox> ...");
}

export async function validateGraphqlCommand(env: EnvName, file: string): Promise<void> {
  const documentText = await readText(resolveFromCwd(file));
  const errors = await validateDocument(env, documentText);
  if (errors.length) {
    throw new UserError(`Validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  console.log(`Valid ${env} GraphQL document: ${file}`);
}

export async function runQueryCommand(input: {
  env: EnvName;
  file: string;
  caseId?: string;
  variables?: string;
}): Promise<void> {
  const resolvedFile = resolveFromCwd(input.file);
  const caseId = await defaultCaseId(input.caseId, resolvedFile);
  const documentText = await readText(resolvedFile);

  if (input.env === "prod") {
    assertOnlyQueries(documentText);
  }

  const kinds = operationKinds(documentText);
  if (kinds.some((kind) => kind !== "query")) {
    throw new UserError(`query command accepts only query documents. Found: ${kinds.join(", ")}`);
  }

  await validateIfSchemaPresent(input.env, documentText);
  const variables = await readVariables(input.variables);
  const response = await requestGraphql(input.env, documentText, variables);
  const result = await writeGraphqlResponse({
    env: input.env,
    caseId,
    command: "query",
    documentPath: resolvedFile,
    variablesPath: input.variables ? resolveFromCwd(input.variables) : undefined,
    operationKinds: kinds,
    response,
  });
  console.log(`Executed ${input.env} query. Response saved to ${result.responsePath}`);
  printGraphqlResponseSummary(result.summary, result.summaryPath);
}

export async function draftMutationCommand(input: { env: EnvName; name: string; caseId?: string }): Promise<void> {
  const outPath = draftMutationPath(input.env, await defaultCaseId(input.caseId), input.name);
  await writeText(
    outPath,
    `# Draft only. Do not execute against prod.\nmutation ${pascalName(input.name)} {\n  # Write mutation here.\n}\n`,
  );
  console.log(`Created mutation draft: ${outPath}`);
}

export async function runMutationCommand(input: {
  env: EnvName;
  file: string;
  caseId?: string;
  variables?: string;
  execute: boolean;
}): Promise<void> {
  const resolvedFile = resolveFromCwd(input.file);
  const caseId = await defaultCaseId(input.caseId, resolvedFile);
  const documentText = await readText(resolvedFile);
  assertContainsMutation(documentText);
  await validateIfSchemaPresent(input.env, documentText);
  const variables = await readVariables(input.variables);
  const kinds = operationKinds(documentText);

  if (input.env === "prod") {
    const result = await writeGraphqlResponse({
      env: input.env,
      caseId,
      command: "prod-mutation-inspection",
      documentPath: resolvedFile,
      variablesPath: input.variables ? resolveFromCwd(input.variables) : undefined,
      operationKinds: kinds,
      response: {
        data: {
          inspectedOnly: true,
          file: input.file,
          operationKinds: kinds,
          variables,
          message: "Prod/live mutation was inspected locally only. No network execution was attempted.",
        },
      },
    });
    console.log(`Prod mutation inspected only. Artifact saved to ${result.responsePath}`);
    printGraphqlResponseSummary(result.summary, result.summaryPath);
    return;
  }

  const response = await requestGraphql(input.env, documentText, variables);
  const result = await writeGraphqlResponse({
    env: input.env,
    caseId,
    command: "mutation",
    documentPath: resolvedFile,
    variablesPath: input.variables ? resolveFromCwd(input.variables) : undefined,
    operationKinds: kinds,
    response,
  });
  console.log(`Executed sandbox mutation. Response saved to ${result.responsePath}`);
  if (input.execute) {
    console.log("Note: --execute is accepted for compatibility but is no longer required for sandbox mutations.");
  }
  printGraphqlResponseSummary(result.summary, result.summaryPath);
}

export async function createGraphqlCommand(input: {
  kind: string;
  env: EnvName;
  name: string;
  caseId?: string;
}): Promise<void> {
  if (input.kind !== "query" && input.kind !== "mutation") {
    throw new UserError("Usage: graphql-new <query|mutation> <prod|sandbox> <name> [--case CASE]");
  }

  const dir =
    input.kind === "query"
      ? path.join(caseEnvDir(await requireCaseId(input.caseId), input.env), "queries")
      : input.env === "prod"
        ? path.join(caseEnvDir(await requireCaseId(input.caseId), input.env), "drafted-mutations")
        : path.join(caseEnvDir(await requireCaseId(input.caseId), input.env), "mutations");
  const filePath = path.join(dir, `${input.name}.graphql`);
  const opName = pascalName(input.name);
  const warning = input.env === "prod" && input.kind === "mutation" ? "# Draft only. Do not execute against prod.\n" : "";
  await writeText(filePath, `${warning}${input.kind} ${opName} {\n  # TODO\n}\n`);
  console.log(`Created ${filePath}`);
}

function printSchemaFind(index: SchemaIndex, term: string): void {
  const lower = term.toLowerCase();
  const matches = Object.entries(index.types)
    .filter(([name, type]) => {
      if (name.toLowerCase().includes(lower) || type.description?.toLowerCase().includes(lower)) {
        return true;
      }
      return Object.keys(type.fields ?? {}).some((field) => field.toLowerCase().includes(lower));
    })
    .slice(0, 50)
    .map(([name, type]) => ({
      name,
      kind: type.kind,
      fields: Object.keys(type.fields ?? {}).slice(0, 25),
      inputFields: Object.keys(type.inputFields ?? {}).slice(0, 25),
      enumValues: type.enumValues?.slice(0, 25),
    }));

  console.log(JSON.stringify(matches, null, 2));
}

function printRootField(index: SchemaIndex, rootKey: "queryType" | "mutationType", fieldName: string): void {
  const rootName = index[rootKey];
  const root = rootName ? index.types[rootName] : undefined;
  const field = root?.fields?.[fieldName];
  if (!rootName || !field) {
    throw new UserError(`No root field ${fieldName} found`);
  }
  console.log(JSON.stringify({ [fieldName]: field }, null, 2));
}

async function validateIfSchemaPresent(env: EnvName, documentText: string): Promise<void> {
  if (!(await pathExists(schemaPath(env, "schema.graphql")))) {
    console.warn(`No cached ${env} schema found. Run: ${cliInvocation()} ${env} schema pull`);
    return;
  }
  const errors = await validateDocument(env, documentText);
  if (errors.length) {
    throw new UserError(`Validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
}

async function readVariables(file?: string): Promise<Record<string, unknown> | undefined> {
  if (!file) {
    return undefined;
  }
  return readJson<Record<string, unknown>>(resolveFromCwd(file));
}

async function writeResponse(env: EnvName, caseId: string | undefined, subdir: string, value: unknown): Promise<string> {
  const outDir = caseId ? path.join(caseEnvDir(caseId, env), subdir) : path.join(appConfig().stateDir, "runs", env);
  await ensureDir(outDir);
  const outPath = path.join(outDir, `${timestampSlug()}.json`);
  await writeJson(outPath, value);
  return outPath;
}

async function writeGraphqlResponse(input: {
  env: EnvName;
  caseId: string | undefined;
  command: "query" | "mutation" | "prod-mutation-inspection";
  documentPath: string;
  variablesPath?: string;
  operationKinds: OperationKind[];
  response: GraphqlResponse;
}): Promise<{ responsePath: string; summaryPath: string; summary: ReturnType<typeof summarizeGraphqlResponse> }> {
  const responsePath = await writeResponse(input.env, input.caseId, "responses", input.response);
  const summary = summarizeGraphqlResponse({
    env: input.env,
    operationKinds: input.operationKinds,
    response: input.response,
    responsePath,
  });
  const summaryPath = responsePath.replace(/\.json$/, "-summary.json");
  await writeJson(summaryPath, summary);
  await appendArtifactIndex(input.caseId, {
    generatedAt: summary.generatedAt,
    env: input.env,
    command: input.command,
    operationKinds: input.operationKinds,
    documentPath: input.documentPath,
    variablesPath: input.variablesPath,
    responsePath,
    summaryPath,
    outcome: summary.outcome,
    permissionBlockers: summary.permissionBlockers,
    topLevelDataKeys: summary.topLevelDataKeys,
  });
  return { responsePath, summaryPath, summary };
}

async function introspectWithFallback(config: ReturnType<typeof envConfig>): Promise<{ response: GraphqlResponse; mode: "modern" | "compatibility" }> {
  const modern = await requestGraphqlWithConfig(config, introspectionQuery(), undefined, {
    acceptGraphqlErrorResponse: true,
  });
  if (!modern.errors?.length || !shouldRetryCompatibilityIntrospection(modern)) {
    return { response: modern, mode: "modern" };
  }

  console.warn("Modern introspection failed on compatibility-sensitive fields. Retrying with compatibility introspection.");
  const compatibility = await requestGraphqlWithConfig(config, compatibilityIntrospectionQuery(), undefined, {
    acceptGraphqlErrorResponse: true,
  });
  return { response: compatibility, mode: "compatibility" };
}

function shouldRetryCompatibilityIntrospection(response: GraphqlResponse): boolean {
  const text = JSON.stringify(response.errors ?? []);
  return /__Schema|isRepeatable|specifiedByURL|specifiedByUrl|includeDeprecated|InputValue|description/i.test(text);
}

async function defaultCaseId(explicitCaseId?: string, filePath?: string): Promise<string | undefined> {
  return explicitCaseId ?? inferCaseIdFromPath(filePath) ?? (await currentCaseId());
}

function inferCaseIdFromPath(filePath: string | undefined): string | undefined {
  if (!filePath) {
    return undefined;
  }
  const relative = path.relative(appConfig().casesDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return undefined;
  }
  const [caseId] = relative.split(path.sep);
  return caseId || undefined;
}

function draftMutationPath(env: EnvName, caseId: string | undefined, name: string): string {
  const fileName = `${name}.graphql`;
  if (caseId) {
    const dir = env === "prod" ? path.join(caseEnvDir(caseId, env), "drafted-mutations") : path.join(caseEnvDir(caseId, env), "mutations");
    return path.join(dir, fileName);
  }
  return path.join(appConfig().cwd, fileName);
}

function pascalName(value: string): string {
  const name = value
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");
  return name || "InvestigationMutation";
}
