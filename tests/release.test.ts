import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

test("CLI help is available through the repository command", () => {
  const result = spawnSync("pnpm", ["dev", "help"], {
    cwd: root,
    encoding: "utf8",
  });

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("saleor-investigate");
  expect(result.stdout).toContain("schema");
  expect(result.stdout).toContain("query");
});

test("the installed skill carries a standalone CLI", () => {
  const bundlePath = path.join(root, "skills", "investigate", "scripts", "saleor-investigate.cjs");
  const result = spawnSync(process.execPath, [bundlePath, "help"], {
    cwd: root,
    encoding: "utf8",
  });
  const prodResult = spawnSync(process.execPath, [bundlePath, "prod", "help"], {
    cwd: root,
    encoding: "utf8",
  });

  expect(result.status, result.stderr).toBe(0);
  expect(prodResult.status, prodResult.stderr).toBe(0);
  expect(result.stdout).toContain("saleor-investigate");
  expect(result.stdout).toContain("config");
  expect(result.stdout).toContain("apps");
  expect(prodResult.stdout).toContain("saleor-investigate prod");
  expect(fs.statSync(bundlePath).mode & 0o111).not.toBe(0);
});

test("the bundled CLI keeps consumer-repository state isolated", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "saleor-skill-consumer-"));
  const bundlePath = path.join(root, "skills", "investigate", "scripts", "saleor-investigate.cjs");

  try {
    const gitResult = spawnSync("git", ["init", "--quiet", temporaryRoot], { encoding: "utf8" });
    expect(gitResult.status, gitResult.stderr).toBe(0);

    const sourceDir = path.join(temporaryRoot, "saleor-core");
    fs.mkdirSync(path.join(sourceDir, "saleor"), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, "manage.py"), "");
    fs.writeFileSync(path.join(sourceDir, "pyproject.toml"), "");

    const appsDir = path.join(temporaryRoot, "saleor-apps");
    fs.mkdirSync(appsDir);
    fs.writeFileSync(path.join(appsDir, "package.json"), '{"name":"saleor-apps"}\n');

    const dataDir = path.join(temporaryRoot, ".saleor-investigate");
    fs.mkdirSync(dataDir);
    fs.writeFileSync(
      path.join(dataDir, "config.env"),
      `SALEOR_SOURCE_DIR=${sourceDir}\nSALEOR_APPS_DIR=${appsDir}\n`,
    );

    const nested = path.join(temporaryRoot, "apps", "storefront");
    fs.mkdirSync(nested, { recursive: true });
    const configResult = spawnSync(process.execPath, [bundlePath, "config", "check"], {
      cwd: nested,
      encoding: "utf8",
    });
    expect(configResult.status, configResult.stderr).toBe(0);
    expect(configResult.stdout).toContain(`Saleor source: ${sourceDir}`);

    const appsResult = spawnSync(process.execPath, [bundlePath, "apps", "read", "package.json"], {
      cwd: nested,
      encoding: "utf8",
    });
    expect(appsResult.status, appsResult.stderr).toBe(0);
    expect(appsResult.stdout).toContain('1: {"name":"saleor-apps"}');

    const caseResult = spawnSync(process.execPath, [bundlePath, "case", "init", "case-installed-smoke"], {
      cwd: nested,
      encoding: "utf8",
    });
    expect(caseResult.status, caseResult.stderr).toBe(0);
    const setup = fs.readFileSync(
      path.join(dataDir, "cases", "case-installed-smoke", "SETUP.md"),
      "utf8",
    );
    expect(setup).toContain(`'${process.execPath}' '${bundlePath}' help`);
    expect(fs.readFileSync(path.join(temporaryRoot, ".git", "info", "exclude"), "utf8")).toContain(
      "/.saleor-investigate/",
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("skill installer help is available without writing files", () => {
  const result = spawnSync("pnpm", ["bootstrap", "--", "--help"], {
    cwd: root,
    encoding: "utf8",
  });

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("Saleor API investigation skill");
  expect(result.stdout).toContain("--agent");
});

test("the distribution exposes one investigation skill", () => {
  const skillRoot = path.join(root, "skills");

  expect(
    fs
      .readdirSync(skillRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  ).toEqual(["investigate"]);
  expect(fs.readFileSync(path.join(skillRoot, "investigate", "SKILL.md"), "utf8")).toContain(
    "## Wrap Up an Investigation",
  );
});

test("package metadata includes the skill distribution files", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
    name: string;
    private: boolean;
    files: string[];
    bin: Record<string, string>;
    scripts: Record<string, string>;
  };

  expect(packageJson.name).toBe("saleor-api-investigator");
  expect(packageJson.private).toBe(true);
  expect(packageJson.files).toEqual([
    "config.example.env",
    "dist",
    "docs",
    "scripts/install-skill.mjs",
    "skills",
    "README.md",
  ]);
  expect(packageJson.bin).toEqual({ "saleor-investigate": "./dist/cli.js" });
  expect(packageJson.scripts["build:skill-cli"]).toBe("node scripts/build-skill-cli.mjs");
  expect(packageJson.scripts["check:skill-cli"]).toBe("node scripts/build-skill-cli.mjs --check");
});
