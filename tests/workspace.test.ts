import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";
import { appConfig } from "../src/config.js";
import { prepareInvestigationWorkspace } from "../src/workspace.js";

const execFileAsync = promisify(execFile);
const originalCwd = process.cwd();
const originalOverride = process.env.SALEOR_INVESTIGATE_DIR;
let temporaryRoot: string | undefined;

afterEach(async () => {
  process.chdir(originalCwd);
  if (originalOverride === undefined) {
    delete process.env.SALEOR_INVESTIGATE_DIR;
  } else {
    process.env.SALEOR_INVESTIGATE_DIR = originalOverride;
  }
  if (temporaryRoot) {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  }
});

test("workspace resolves to the Git root and is locally excluded", async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "saleor-workspace-"));
  await execFileAsync("git", ["init", "--quiet", temporaryRoot]);
  const nested = path.join(temporaryRoot, "apps", "storefront");
  await fs.mkdir(nested, { recursive: true });
  process.chdir(nested);
  delete process.env.SALEOR_INVESTIGATE_DIR;

  await prepareInvestigationWorkspace();

  const config = appConfig();
  const canonicalRoot = await fs.realpath(temporaryRoot);
  expect(config.cwd).toBe(canonicalRoot);
  expect(config.workspaceDir).toBe(path.join(canonicalRoot, ".saleor-investigate"));
  expect(config.configPath).toBe(path.join(canonicalRoot, ".saleor-investigate", "config.env"));
  await expect(fs.readFile(path.join(temporaryRoot, ".git", "info", "exclude"), "utf8")).resolves.toContain(
    "/.saleor-investigate/",
  );
});

test("workspace root may be overridden for a monorepo", async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "saleor-workspace-"));
  await execFileAsync("git", ["init", "--quiet", temporaryRoot]);
  const nested = path.join(temporaryRoot, "packages", "shop");
  await fs.mkdir(nested, { recursive: true });
  process.chdir(temporaryRoot);
  process.env.SALEOR_INVESTIGATE_DIR = "packages/shop";

  expect(appConfig().cwd).toBe(await fs.realpath(nested));
  await prepareInvestigationWorkspace();
  await expect(fs.readFile(path.join(temporaryRoot, ".git", "info", "exclude"), "utf8")).resolves.toContain(
    "/packages/shop/.saleor-investigate/",
  );
});
