import { spawn } from "node:child_process";
import path from "node:path";
import { requireCaseId } from "../cases.js";
import { appConfig } from "../config.js";
import { UserError } from "../errors.js";
import { caseDir, readText, writeText } from "../fs.js";

export async function sourceSearchCommand(term: string): Promise<void> {
  const config = appConfig();
  if (!config.sourceDir) {
    throw new UserError("Missing SALEOR_SOURCE_DIR in environment or .saleor-investigate/config.env");
  }
  await searchRepository(config.sourceDir, term);
}

export async function sourceReadCommand(relativePath: string, start?: string, count?: string): Promise<void> {
  const config = appConfig();
  if (!config.sourceDir) {
    throw new UserError("Missing SALEOR_SOURCE_DIR in environment or .saleor-investigate/config.env");
  }
  await readRepositoryFile(config.sourceDir, relativePath, start, count);
}

export async function docsSearchCommand(term: string): Promise<void> {
  const config = appConfig();
  if (!config.docsDir) {
    throw new UserError("Missing SALEOR_DOCS_DIR in environment or .saleor-investigate/config.env");
  }
  await searchRepository(config.docsDir, term);
}

export async function docsReadCommand(relativePath: string, start?: string, count?: string): Promise<void> {
  const config = appConfig();
  if (!config.docsDir) {
    throw new UserError("Missing SALEOR_DOCS_DIR in environment or .saleor-investigate/config.env");
  }
  await readRepositoryFile(config.docsDir, relativePath, start, count);
}

export async function docsPatchProposalCommand(caseId: string | undefined, title: string): Promise<void> {
  const resolvedCaseId = caseId ?? (await requireCaseId());
  const outPath = path.join(caseDir(resolvedCaseId), "docs", `${slug(title)}.md`);
  await writeText(
    outPath,
    `# Docs Patch Proposal: ${title}\n\n## Missing or unclear behavior\n\n## Evidence from investigation\n\n## Proposed docs location\n\n## Draft content\n\n## Notes\n\n`,
  );
  console.log(`Created docs patch proposal: ${outPath}`);
}

async function searchRepository(root: string, term: string): Promise<void> {
  await run("rg", ["--line-number", "--context", "2", term, root], appConfig().cwd, true);
}

async function readRepositoryFile(root: string, relativePath: string, startValue?: string, countValue?: string): Promise<void> {
  const filePath = resolveInside(root, relativePath);
  const contents = await readText(filePath);
  const lines = contents.split("\n");
  const start = startValue ? Number(startValue) : 1;
  const count = countValue ? Number(countValue) : 120;
  if (!Number.isInteger(start) || start < 1 || !Number.isInteger(count) || count < 1) {
    throw new UserError("read line arguments must be positive integers");
  }
  const excerpt = lines.slice(start - 1, start - 1 + count).map((line, index) => `${start + index}: ${line}`);
  console.log(excerpt.join("\n"));
}

function resolveInside(root: string, relativePath: string): string {
  const fullPath = path.resolve(root, relativePath);
  const resolvedRoot = path.resolve(root);
  if (!fullPath.startsWith(`${resolvedRoot}${path.sep}`) && fullPath !== resolvedRoot) {
    throw new UserError("Path escapes configured repository root");
  }
  return fullPath;
}

function run(command: string, args: string[], cwd: string, inherit = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    if (!inherit) {
      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
    }

    child.on("error", (error) => {
      reject(new UserError(`Failed to run ${command}: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        if (stdout.trim()) {
          console.log(stdout.trim());
        }
        resolve();
      } else {
        reject(new UserError(`${command} exited with ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
      }
    });
  });
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "untitled";
}
