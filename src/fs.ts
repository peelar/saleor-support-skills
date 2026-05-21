import fs from "node:fs/promises";
import path from "node:path";
import { appConfig } from "./config.js";
import { UserError } from "./errors.js";
import type { EnvName } from "./types.js";

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function writeText(filePath: string, contents: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, "utf8");
}

export async function writeTextIfMissing(filePath: string, contents: string): Promise<boolean> {
  if (await pathExists(filePath)) {
    return false;
  }
  await writeText(filePath, contents);
  return true;
}

export async function appendText(filePath: string, contents: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, contents, "utf8");
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readText(filePath)) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function resolveFromCwd(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

export function caseDir(caseId: string): string {
  assertSafeSegment(caseId, "case id");
  return path.join(appConfig().casesDir, caseId);
}

export function caseEnvDir(caseId: string, env: EnvName): string {
  return path.join(caseDir(caseId), env);
}

export function schemaDir(env: EnvName): string {
  return path.join(appConfig().stateDir, "schema", env);
}

export function schemaPath(env: EnvName, fileName: "introspection.json" | "schema.graphql" | "index.json"): string {
  return path.join(schemaDir(env), fileName);
}

export function currentCasePath(): string {
  return path.join(appConfig().stateDir, "current-case.json");
}

export function timestampSlug(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function assertSafeSegment(value: string, label: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new UserError(`${label} may only contain letters, numbers, dots, underscores, and dashes`);
  }
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
