import fs from "node:fs/promises";
import path from "node:path";
import { appConfig, envConfig } from "../config.js";
import { UserError } from "../errors.js";
import { cliInvocation } from "../invocation.js";
import { prepareInvestigationWorkspace } from "../workspace.js";

export async function checkInvestigationConfig(): Promise<void> {
  await prepareInvestigationWorkspace();
  const errors: string[] = [];

  for (const env of ["prod", "sandbox"] as const) {
    const apiUrlEnvVar = env === "prod" ? "SALEOR_PROD_API_URL" : "SALEOR_SANDBOX_API_URL";
    if (!process.env[apiUrlEnvVar]) {
      continue;
    }
    try {
      envConfig(env);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const config = appConfig();
  const sourceDir = await validateSourceDir(config.cwd, config.sourceDir, errors);
  await validateOptionalDirectory(config.cwd, "SALEOR_DOCS_DIR", config.docsDir, errors);

  if (errors.length > 0) {
    throw new UserError(
      `Investigation config is incomplete:\n${errors.map((error) => `- ${error}`).join("\n")}\nUpdate ${config.configPath}, then run \`${cliInvocation()} config check\` again.`,
    );
  }

  console.log(`Investigation config is ready. Saleor source: ${sourceDir}`);
}

async function validateSourceDir(cwd: string, value: string | undefined, errors: string[]): Promise<string> {
  if (!value?.trim()) {
    errors.push("Missing SALEOR_SOURCE_DIR in environment or .saleor-investigate/config.env");
    return "";
  }

  const resolved = path.resolve(cwd, value);
  if (!(await isDirectory(resolved))) {
    errors.push(`SALEOR_SOURCE_DIR is not a readable directory: ${resolved}`);
    return resolved;
  }

  const markers = ["manage.py", "pyproject.toml", "saleor"];
  const missingMarkers: string[] = [];
  for (const marker of markers) {
    if (!(await pathExists(path.join(resolved, marker)))) {
      missingMarkers.push(marker);
    }
  }

  if (missingMarkers.length > 0) {
    errors.push(`SALEOR_SOURCE_DIR does not look like a Saleor Core checkout; missing: ${missingMarkers.join(", ")}`);
  }

  return resolved;
}

async function validateOptionalDirectory(
  cwd: string,
  name: "SALEOR_DOCS_DIR",
  value: string | undefined,
  errors: string[],
): Promise<void> {
  if (!value?.trim()) {
    return;
  }

  const resolved = path.resolve(cwd, value);
  if (!(await isDirectory(resolved))) {
    errors.push(`${name} is configured but is not a readable directory: ${resolved}`);
  }
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
