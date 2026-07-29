import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { appConfig } from "./config.js";
import { ensureDir } from "./fs.js";

const execFileAsync = promisify(execFile);

export async function prepareInvestigationWorkspace(): Promise<void> {
  const config = appConfig();
  await ensureDir(config.workspaceDir);
  await setPrivateDirectoryMode(config.workspaceDir);
  await addLocalGitExclude(config.cwd, config.workspaceDir);
}

async function addLocalGitExclude(workspaceRoot: string, dataDir: string): Promise<void> {
  const gitRoot = await gitPath(workspaceRoot, "--show-toplevel");
  const excludePathValue = await gitPath(workspaceRoot, "--git-path", "info/exclude");
  if (!gitRoot || !excludePathValue) {
    return;
  }

  const relative = path.relative(gitRoot, dataDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return;
  }

  const excludePath = path.isAbsolute(excludePathValue)
    ? excludePathValue
    : path.resolve(workspaceRoot, excludePathValue);
  const pattern = `/${relative.split(path.sep).join("/")}/`;
  const original = await readOptionalText(excludePath);
  if (original.split(/\r?\n/).includes(pattern)) {
    return;
  }

  await ensureDir(path.dirname(excludePath));
  const separator = original.length > 0 && !original.endsWith("\n") ? "\n" : "";
  await fs.appendFile(excludePath, `${separator}${pattern}\n`, "utf8");
}

async function gitPath(cwd: string, ...args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", cwd, "rev-parse", ...args], {
      encoding: "utf8",
    });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
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

async function setPrivateDirectoryMode(dir: string): Promise<void> {
  try {
    await fs.chmod(dir, 0o700);
  } catch {
    // Some filesystems do not support Unix permissions.
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
