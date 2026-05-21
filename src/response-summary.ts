import type { GraphqlResponse } from "./client.js";
import type { EnvName, OperationKind } from "./types.js";

export type PermissionBlocker = {
  path?: string;
  requiredPermissions: string[];
  message: string;
};

export type GraphqlResponseSummary = {
  generatedAt: string;
  env: EnvName;
  operationKinds: OperationKind[];
  outcome: "success" | "errors" | "permission-blocked";
  topLevelDataKeys: string[];
  errorCount: number;
  errors: Array<{
    message: string;
    path?: string;
    code?: string;
  }>;
  permissionBlockers: PermissionBlocker[];
  responsePath?: string;
};

type GraphqlError = NonNullable<GraphqlResponse["errors"]>[number];

export function summarizeGraphqlResponse(input: {
  env: EnvName;
  operationKinds: OperationKind[];
  response: GraphqlResponse;
  responsePath?: string;
}): GraphqlResponseSummary {
  const errors = input.response.errors ?? [];
  const permissionBlockers = errors.map(permissionBlockerFromError).filter((value): value is PermissionBlocker => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    env: input.env,
    operationKinds: input.operationKinds,
    outcome: permissionBlockers.length ? "permission-blocked" : errors.length ? "errors" : "success",
    topLevelDataKeys: topLevelDataKeys(input.response.data),
    errorCount: errors.length,
    errors: errors.map((error) => ({
      message: error.message,
      path: graphqlPath(error.path),
      code: graphqlErrorCode(error),
    })),
    permissionBlockers,
    responsePath: input.responsePath,
  };
}

export function printGraphqlResponseSummary(summary: GraphqlResponseSummary, summaryPath?: string): void {
  console.log(`Outcome: ${summary.outcome}`);
  console.log(`Top-level data keys: ${summary.topLevelDataKeys.length ? summary.topLevelDataKeys.join(", ") : "(none)"}`);

  if (summary.errorCount) {
    console.log(`GraphQL errors: ${summary.errorCount}`);
  }

  for (const blocker of summary.permissionBlockers) {
    const permissionText = blocker.requiredPermissions.length ? blocker.requiredPermissions.join(" or ") : "the required scope";
    const pathText = blocker.path ? ` at ${blocker.path}` : "";
    console.log(`Permission needed: ask the user to extend the ${summary.env} token with ${permissionText}${pathText}.`);
  }

  if (summaryPath) {
    console.log(`Summary saved to ${summaryPath}`);
  }
}

function topLevelDataKeys(data: unknown): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return [];
  }
  return Object.keys(data);
}

function permissionBlockerFromError(error: GraphqlError): PermissionBlocker | undefined {
  const code = graphqlErrorCode(error);
  const permissions = permissionsFromMessage(error.message);
  const isPermissionError = code === "PermissionDenied" || code === "FORBIDDEN" || permissions.length > 0;

  if (!isPermissionError) {
    return undefined;
  }

  return {
    path: graphqlPath(error.path),
    requiredPermissions: permissions,
    message: error.message,
  };
}

function permissionsFromMessage(message: string): string[] {
  const matches = new Set<string>();
  const permissionPattern = /\b[A-Z][A-Z0-9_]*\b/g;

  for (const match of message.matchAll(permissionPattern)) {
    const value = match[0];
    if (value.includes("_")) {
      matches.add(value);
    }
  }

  return [...matches];
}

function graphqlErrorCode(error: GraphqlError): string | undefined {
  const extensions = objectValue(error.extensions);
  const exception = objectValue(extensions?.exception);
  return stringValue(extensions?.code) ?? stringValue(exception?.code);
}

function graphqlPath(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.map(String).join(".");
  }
  return typeof value === "string" ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
