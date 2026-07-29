import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { checkInvestigationConfig } from "../src/commands/configCommands.js";

const originalEnv = {
  SALEOR_PROD_API_URL: process.env.SALEOR_PROD_API_URL,
  SALEOR_SANDBOX_API_URL: process.env.SALEOR_SANDBOX_API_URL,
  SALEOR_SOURCE_DIR: process.env.SALEOR_SOURCE_DIR,
  SALEOR_DOCS_DIR: process.env.SALEOR_DOCS_DIR,
  SALEOR_INVESTIGATE_DIR: process.env.SALEOR_INVESTIGATE_DIR,
};
const originalCwd = process.cwd();
let temporaryRoot: string | undefined;

afterEach(async () => {
  restoreEnv();
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  if (temporaryRoot) {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  }
});

test("config check accepts endpoints and a Saleor Core checkout", async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "saleor-config-"));
  await fs.writeFile(path.join(temporaryRoot, "manage.py"), "");
  await fs.writeFile(path.join(temporaryRoot, "pyproject.toml"), "");
  await fs.mkdir(path.join(temporaryRoot, "saleor"));
  process.chdir(temporaryRoot);
  setEndpointConfig();
  process.env.SALEOR_SOURCE_DIR = temporaryRoot;
  delete process.env.SALEOR_DOCS_DIR;
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

  await expect(checkInvestigationConfig()).resolves.toBeUndefined();

  expect(log).toHaveBeenCalledWith(`Investigation config is ready. Saleor source: ${temporaryRoot}`);
});

test("config check rejects a missing Saleor source path", async () => {
  setEndpointConfig();
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "saleor-config-"));
  process.chdir(temporaryRoot);
  delete process.env.SALEOR_SOURCE_DIR;
  delete process.env.SALEOR_DOCS_DIR;

  await expect(checkInvestigationConfig()).rejects.toThrow(/Missing SALEOR_SOURCE_DIR/);
});

function setEndpointConfig(): void {
  process.env.SALEOR_PROD_API_URL = "https://live.example.com/graphql/";
  process.env.SALEOR_SANDBOX_API_URL = "https://sandbox.example.com/graphql/";
}

function restoreEnv(): void {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}
