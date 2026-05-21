import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { UserError } from "./errors.js";
import type { EnvName } from "./types.js";

loadDotenv();

export type SaleorEnvConfig = {
  name: EnvName;
  apiUrl: string;
  token?: string;
};

export type AppConfig = {
  cwd: string;
  stateDir: string;
  casesDir: string;
  sourceDir?: string;
  docsDir?: string;
};

export const saleorApiUrlEnvVars = ["SALEOR_PROD_API_URL", "SALEOR_SANDBOX_API_URL"] as const;

export type SaleorApiUrlEnvVar = (typeof saleorApiUrlEnvVars)[number];

export function appConfig(): AppConfig {
  const cwd = process.cwd();
  return {
    cwd,
    stateDir: path.join(cwd, ".support-agent"),
    casesDir: path.join(cwd, "cases"),
    sourceDir: process.env.SALEOR_SOURCE_DIR,
    docsDir: process.env.SALEOR_DOCS_DIR,
  };
}

export function envConfig(name: EnvName): SaleorEnvConfig {
  const prefix = name === "prod" ? "SALEOR_PROD" : "SALEOR_SANDBOX";
  const apiUrl = process.env[`${prefix}_API_URL`];
  const apiUrlEnvVar = `${prefix}_API_URL` as SaleorApiUrlEnvVar;

  if (!apiUrl) {
    throw new UserError(`Missing ${apiUrlEnvVar} in environment or .env`);
  }

  return {
    name,
    apiUrl: validateSaleorApiUrl(apiUrlEnvVar, apiUrl),
    token: process.env[`${prefix}_TOKEN`],
  };
}

export function validateSaleorApiUrl(name: SaleorApiUrlEnvVar, value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new UserError(`${name} cannot be empty`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UserError(`${name} must be a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UserError(`${name} must use http or https`);
  }

  if (!parsed.pathname.includes("/graphql/")) {
    throw new UserError(`${name} must include "/graphql/" in the URL path`);
  }

  return trimmed;
}

export function parseEnvName(value: string | undefined): EnvName {
  if (value === "prod" || value === "sandbox") {
    return value;
  }

  throw new UserError(`Expected environment to be "prod" or "sandbox", got "${value ?? ""}"`);
}
