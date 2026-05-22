import { envConfig, type SaleorEnvConfig } from "./config.js";
import { UserError } from "./errors.js";
import { assertOnlyQueries } from "./graphql.js";
import type { EnvName } from "./types.js";

export type GraphqlResponse = {
  data?: unknown;
  errors?: Array<{ message: string; [key: string]: unknown }>;
  extensions?: unknown;
};

export async function requestGraphql(
  env: EnvName,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphqlResponse> {
  return requestGraphqlWithConfig(envConfig(env), query, variables);
}

export async function requestGraphqlWithConfig(
  config: SaleorEnvConfig,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphqlResponse> {
  if (config.name === "prod") {
    assertOnlyQueries(query);
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (config.token) {
    headers.authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new UserError(`GraphQL endpoint returned non-JSON response (${response.status}): ${text.slice(0, 500)}`);
  }

  if (!response.ok) {
    throw new UserError(`GraphQL request failed with HTTP ${response.status}: ${JSON.stringify(body, null, 2)}`);
  }

  return body as GraphqlResponse;
}
