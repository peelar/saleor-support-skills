import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  appConfig,
  saleorApiUrlEnvVars,
  validateSaleorApiUrl,
  type SaleorApiUrlEnvVar,
} from "../config.js";
import { UserError } from "../errors.js";

type EnvValueMap = Partial<Record<SaleorApiUrlEnvVar, string>>;

const saleorApiUrlInputLabels: Record<SaleorApiUrlEnvVar, string> = {
  SALEOR_PROD_API_URL: "Customer/prod Saleor GraphQL endpoint URL",
  SALEOR_SANDBOX_API_URL: "Sandbox Saleor GraphQL endpoint URL",
};

export async function configureSaleorApiEnvVars(): Promise<void> {
  const values: EnvValueMap = {};
  const invalidMessages: string[] = [];

  for (const name of saleorApiUrlEnvVars) {
    const value = process.env[name];
    if (!value) {
      invalidMessages.push(`${saleorApiUrlInputDescription(name)} is missing`);
      continue;
    }

    try {
      values[name] = validateSaleorApiUrl(name, value);
    } catch (error) {
      if (error instanceof UserError) {
        invalidMessages.push(describeSaleorApiUrlError(name, error.message));
      } else {
        throw error;
      }
    }
  }

  if (!input.isTTY || !output.isTTY) {
    if (invalidMessages.length > 0) {
      throw new UserError(
        `Cannot prompt for Saleor endpoint configuration in a non-interactive shell:\n${invalidMessages
          .map((message) => `- ${message}`)
          .join("\n")}`,
      );
    }
    console.log("Saleor endpoint URLs are valid.");
    return;
  }

  const promptedValues = await promptForMissingOrInvalidValues(values);
  const nextValues = completeEnvValueMap({ ...values, ...promptedValues });
  const envPath = path.join(appConfig().cwd, ".env");
  const changed = await writeEnvFile(envPath, nextValues);

  for (const [name, value] of Object.entries(nextValues) as Array<[SaleorApiUrlEnvVar, string]>) {
    process.env[name] = value;
  }

  console.log(changed ? `Saved Saleor endpoint URLs to ${envPath}` : "Saleor endpoint URLs are valid.");
}

async function promptForMissingOrInvalidValues(existingValues: EnvValueMap): Promise<EnvValueMap> {
  const rl = createInterface({ input, output });
  const values: EnvValueMap = {};

  try {
    for (const name of saleorApiUrlEnvVars) {
      if (existingValues[name]) {
        continue;
      }

      values[name] = await promptForValidUrl(rl, name);
    }
  } finally {
    rl.close();
  }

  return values;
}

async function promptForValidUrl(
  rl: ReturnType<typeof createInterface>,
  name: SaleorApiUrlEnvVar,
): Promise<string> {
  while (true) {
    const value = await rl.question(`${saleorApiUrlInputDescription(name)}: `);

    try {
      return validateSaleorApiUrl(name, value);
    } catch (error) {
      if (error instanceof UserError) {
        console.error(describeSaleorApiUrlError(name, error.message));
        continue;
      }
      throw error;
    }
  }
}

async function writeEnvFile(envPath: string, values: Record<SaleorApiUrlEnvVar, string>): Promise<boolean> {
  const original = await readOptionalText(envPath);
  const lines = original ? original.split(/\r?\n/) : [];
  const seen = new Set<SaleorApiUrlEnvVar>();
  const nextLines = lines.map((line) => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line);
    const name = match?.[1] as SaleorApiUrlEnvVar | undefined;
    if (name && isSaleorApiUrlEnvVar(name)) {
      seen.add(name);
      return `${name}=${values[name]}`;
    }
    return line;
  });

  if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
    nextLines.push("");
  }

  for (const name of saleorApiUrlEnvVars) {
    if (!seen.has(name)) {
      nextLines.push(`${name}=${values[name]}`);
    }
  }

  const next = `${nextLines.join("\n").replace(/\n+$/, "")}\n`;
  if (next === original) {
    return false;
  }

  await fs.writeFile(envPath, next, "utf8");
  return true;
}

async function readOptionalText(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function isSaleorApiUrlEnvVar(value: string): value is SaleorApiUrlEnvVar {
  return saleorApiUrlEnvVars.includes(value as SaleorApiUrlEnvVar);
}

function completeEnvValueMap(values: EnvValueMap): Record<SaleorApiUrlEnvVar, string> {
  for (const name of saleorApiUrlEnvVars) {
    if (!values[name]) {
      throw new UserError(`${saleorApiUrlInputDescription(name)} is required`);
    }
  }

  return values as Record<SaleorApiUrlEnvVar, string>;
}

function saleorApiUrlInputDescription(name: SaleorApiUrlEnvVar): string {
  return `${saleorApiUrlInputLabels[name]} (${name})`;
}

function describeSaleorApiUrlError(name: SaleorApiUrlEnvVar, message: string): string {
  return message.replace(name, saleorApiUrlInputDescription(name));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
