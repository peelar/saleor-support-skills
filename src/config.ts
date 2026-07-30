import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { UserError } from "./errors.js";
import type { EnvName } from "./types.js";

export type SaleorEnvConfig = {
  name: EnvName;
  apiUrl: string;
  token?: string;
};

export type AppConfig = {
  cwd: string;
  workspaceDir: string;
  configPath: string;
  stateDir: string;
  casesDir: string;
  sourceDir?: string;
  appsDir?: string;
  docsDir?: string;
};

export const saleorApiUrlEnvVars = ["SALEOR_PROD_API_URL", "SALEOR_SANDBOX_API_URL"] as const;

export type SaleorApiUrlEnvVar = (typeof saleorApiUrlEnvVars)[number];

export function appConfig(): AppConfig {
  const cwd = resolveWorkspaceDir();
  const workspaceDir = path.join(cwd, ".saleor-investigate");
  return {
    cwd,
    workspaceDir,
    configPath: path.join(workspaceDir, "config.env"),
    stateDir: workspaceDir,
    casesDir: path.join(workspaceDir, "cases"),
    sourceDir: resolveOptionalPath(cwd, process.env.SALEOR_SOURCE_DIR),
    appsDir: resolveOptionalPath(cwd, process.env.SALEOR_APPS_DIR),
    docsDir: resolveOptionalPath(cwd, process.env.SALEOR_DOCS_DIR),
  };
}

export function loadInvestigationEnv(): void {
  loadDotenv({ path: appConfig().configPath });
}

export function envConfig(name: EnvName): SaleorEnvConfig {
  const prefix = name === "prod" ? "SALEOR_PROD" : "SALEOR_SANDBOX";
  const apiUrl = process.env[`${prefix}_API_URL`];
  const apiUrlEnvVar = `${prefix}_API_URL` as SaleorApiUrlEnvVar;

  if (!apiUrl) {
    throw new UserError(`Missing ${apiUrlEnvVar} in environment or .saleor-investigate/config.env`);
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

function resolveWorkspaceDir(): string {
  const requested = process.env.SALEOR_INVESTIGATE_DIR?.trim();
  if (requested) {
    return path.resolve(process.cwd(), requested);
  }

  return findGitRoot(process.cwd()) ?? process.cwd();
}

function findGitRoot(start: string): string | undefined {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function resolveOptionalPath(root: string, value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? path.resolve(root, trimmed) : undefined;
}
