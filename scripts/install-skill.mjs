#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const root = process.cwd();
const skillNames = ["investigate"];

const defaultScope = process.env.npm_lifecycle_event === "bootstrap" ? "project" : "global";

const skillAgents = {
  "claude-code": {
    label: "Claude Code",
    projectSkills: [".claude", "skills"],
    globalSkills: [".claude", "skills"],
  },
  codex: {
    label: "Codex",
    projectSkills: [".agents", "skills"],
    globalSkills: [".codex", "skills"],
  },
  "gemini-cli": {
    label: "Gemini CLI",
    projectSkills: [".gemini", "skills"],
    globalSkills: [".gemini", "skills"],
  },
  windsurf: {
    label: "Windsurf",
    projectSkills: [".windsurf", "skills"],
    globalSkills: [".codeium", "windsurf", "skills"],
  },
  universal: {
    label: "Universal Agent Skills",
    projectSkills: [".agents", "skills"],
    globalSkills: [".config", "agents", "skills"],
  },
};

const adapterAgents = {
  cursor: {
    label: "Cursor",
    projectSkillDirs: [
      [".cursor", "skills"],
      [".agents", "skills"],
    ],
    globalSkillDirs: [[".cursor", "skills"]],
    adapters: [
      {
        pathParts: [".cursor", "rules", "saleor-api-investigator.mdc"],
        content: cursorRule(),
      },
    ],
  },
  "github-copilot": {
    label: "GitHub Copilot",
    projectSkillDirs: [[".agents", "skills"]],
    globalSkillDirs: [[".copilot", "skills"]],
    adapters: [
      {
        pathParts: [".github", "instructions", "saleor-api-investigator.instructions.md"],
        content: copilotInstructions(),
      },
    ],
  },
  cline: {
    label: "Cline",
    projectSkillDirs: [[".agents", "skills"]],
    globalSkillDirs: [[".agents", "skills"]],
    adapters: [
      {
        pathParts: [".clinerules", "saleor-api-investigator.md"],
        content: clineRule(),
      },
    ],
  },
};

const allAgents = {
  ...skillAgents,
  ...adapterAgents,
};

const args = parseArgs(process.argv.slice(2));
const scope = args.scope ?? defaultScope;
const force = args.force;

async function main() {
  for (const skillName of skillNames) {
    await fs.access(path.join(root, "skills", skillName, "SKILL.md"));
  }

  const requestedAgents = args.agents.length
    ? args.agents
    : await defaultAgentsForInvocation();
  const agents = expandAgents(requestedAgents);
  const installed = [];

  for (const agentName of agents) {
    const agent = allAgents[agentName];
    if (!agent) {
      throw new Error(
        `Unknown agent "${agentName}". Supported agents: ${Object.keys(allAgents).join(", ")}, all`,
      );
    }

    if ("projectSkills" in agent) {
      installed.push(...(await installSkills(agentName, agent.label, agent, scope)));
      continue;
    }

    installed.push(...(await installAdapterAgent(agentName, agent, scope)));
  }

  console.log(`Installed the investigation skill for ${installed.length} target${installed.length === 1 ? "" : "s"}:`);
  for (const item of installed) {
    console.log(`- ${item}`);
  }
}

async function defaultAgentsForInvocation() {
  if (process.env.npm_lifecycle_event === "bootstrap") {
    return promptForAgents();
  }

  return ["codex"];
}

async function installAdapterAgent(agentName, agent, installScope) {
  const skillDirs = installScope === "global" ? agent.globalSkillDirs : agent.projectSkillDirs;
  const installed = [];

  for (const dirParts of skillDirs) {
    const targetRoot = resolveRootedPath(dirParts, installScope);
    installed.push(...(await copySkills(`${agent.label} skill`, targetRoot)));
  }

  if (installScope === "project") {
    for (const adapter of agent.adapters) {
      installed.push(await writeAdapter(`${agent.label} adapter`, adapter.pathParts, adapter.content));
    }
  } else {
    installed.push(`${agent.label}: global skill installed; project adapter skipped for global scope`);
  }

  if (agentName === "cursor" && installScope === "global") {
    installed.push("Cursor: add a project rule if you want automatic workflow reminders in this repo");
  }

  return installed;
}

async function installSkills(agentName, label, agent, installScope) {
  const targetRoot = resolveRootedPath(
    installScope === "global" ? agent.globalSkills : agent.projectSkills,
    installScope,
  );

  if (agentName === "codex" && installScope === "global" && process.env.CODEX_HOME) {
    return copySkills(label, path.join(process.env.CODEX_HOME, "skills"));
  }

  return copySkills(label, targetRoot);
}

async function copySkills(label, targetRoot) {
  await fs.mkdir(targetRoot, { recursive: true });
  const installed = [];

  for (const skillName of skillNames) {
    const source = path.join(root, "skills", skillName);
    const target = path.join(targetRoot, skillName);

    if (await exists(target)) {
      if (!force) {
        throw new Error(`${target} already exists. Re-run with --force to replace it.`);
      }
      await fs.rm(target, { recursive: true, force: true });
    }

    await fs.cp(source, target, { recursive: true });
    installed.push(`${label}: ${target}`);
  }

  return installed;
}

async function writeAdapter(label, pathParts, content) {
  const target = path.join(root, ...pathParts);
  await fs.mkdir(path.dirname(target), { recursive: true });

  if ((await exists(target)) && !force) {
    throw new Error(`${target} already exists. Re-run with --force to replace it.`);
  }

  await fs.writeFile(target, content);
  return `${label}: ${target}`;
}

function resolveRootedPath(parts, installScope) {
  const base = installScope === "global" ? os.homedir() : root;
  return path.join(base, ...parts);
}

function parseArgs(rawArgs) {
  const parsed = {
    agents: [],
    force: false,
    scope: undefined,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--force") {
      parsed.force = true;
      continue;
    }

    if (arg === "--project") {
      parsed.scope = "project";
      continue;
    }

    if (arg === "--global" || arg === "-g") {
      parsed.scope = "global";
      continue;
    }

    if (arg === "--scope") {
      const value = rawArgs[index + 1];
      if (value !== "project" && value !== "global") {
        throw new Error("--scope must be either project or global");
      }
      parsed.scope = value;
      index += 1;
      continue;
    }

    if (arg === "--agent" || arg === "-a") {
      const value = rawArgs[index + 1];
      if (!value) {
        throw new Error("--agent requires a value");
      }
      parsed.agents.push(...splitAgents(value));
      index += 1;
      continue;
    }

    if (arg.startsWith("--agent=")) {
      parsed.agents.push(...splitAgents(arg.slice("--agent=".length)));
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return parsed;
}

function splitAgents(value) {
  return value
    .split(",")
    .map((agent) => agent.trim())
    .filter(Boolean);
}

function expandAgents(agents) {
  if (!agents.includes("all")) {
    return agents;
  }

  return Object.keys(allAgents);
}

function cursorRule() {
  return `---
description: Saleor API investigation workflow.
alwaysApply: false
---

# Saleor API Investigation

When the user asks to investigate a Saleor API issue, read and follow \`skills/investigate/SKILL.md\`.

Hard rules:
- Prod/live GraphQL is read-only.
- Never execute mutations or subscriptions against prod.
- Use \`pnpm sandbox ...\` for sandbox writes.
- Keep \`SALEOR_*\` endpoint URLs and tokens in \`.saleor-investigate/config.env\`.
`;
}

function copilotInstructions() {
  return `---
applyTo: "**"
---

# Saleor API Investigation

When working on Saleor API investigations in this repository, read and follow \`skills/investigate/SKILL.md\`.

Prod/live GraphQL is read-only. Never execute mutations or subscriptions against prod. Use \`pnpm sandbox ...\` for sandbox writes.
`;
}

function clineRule() {
  return `# Saleor API Investigation

When the user asks to investigate a Saleor API issue, read and follow \`skills/investigate/SKILL.md\`.

- Prod/live GraphQL is read-only.
- Never execute mutations or subscriptions against prod.
- Use \`pnpm sandbox ...\` for sandbox writes.
- Keep \`SALEOR_*\` endpoint URLs and tokens in \`.saleor-investigate/config.env\`.
`;
}

function printHelp() {
  console.log(`Install the Saleor API investigation skill for coding agents.

Usage:
  pnpm bootstrap
  pnpm bootstrap -- --agent claude-code
  pnpm bootstrap -- --agent codex,claude-code,gemini-cli
  pnpm bootstrap -- --agent all --force
  pnpm skill:install

Options:
  -a, --agent <name>   Agent to install for. Repeat or comma-separate values.
                       Supported: ${Object.keys(allAgents).join(", ")}, all
  --project            Install into project-local agent directories.
  -g, --global         Install into user-global agent directories.
  --scope <scope>      project or global.
  --force              Replace existing files.

Defaults:
  pnpm bootstrap       opens an interactive agent picker and installs into this project.
  pnpm skill:install   installs Codex globally, preserving the original behavior.
`);
}

async function promptForAgents() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Interactive bootstrap requires a TTY. Pass --agent <name> for non-interactive use.");
  }

  const options = Object.entries(allAgents).map(([name, agent]) => ({
    name,
    label: agent.label,
  }));
  const selected = new Set(["codex"]);
  let cursor = options.findIndex((option) => option.name === "codex");
  if (cursor < 0) {
    cursor = 0;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdout.write("\x1b[?25l");

  return await new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.off("keypress", onKeypress);
      process.stdin.pause();
      process.stdout.write("\x1b[?25h");
    };

    const render = () => {
      process.stdout.write("\x1b[2J\x1b[H");
      process.stdout.write("Select coding agents to bootstrap\n\n");
      process.stdout.write("Use arrows to move, space to toggle, a to toggle all, enter to confirm.\n\n");

      options.forEach((option, index) => {
        const pointer = index === cursor ? ">" : " ";
        const checked = selected.has(option.name) ? "x" : " ";
        process.stdout.write(`${pointer} [${checked}] ${option.label} (${option.name})\n`);
      });
    };

    const onKeypress = (_text, key) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Bootstrap cancelled."));
        return;
      }

      if (key.name === "up") {
        cursor = (cursor + options.length - 1) % options.length;
        render();
        return;
      }

      if (key.name === "down") {
        cursor = (cursor + 1) % options.length;
        render();
        return;
      }

      if (key.name === "space") {
        const name = options[cursor].name;
        if (selected.has(name)) {
          selected.delete(name);
        } else {
          selected.add(name);
        }
        render();
        return;
      }

      if (key.name === "a") {
        if (selected.size === options.length) {
          selected.clear();
        } else {
          for (const option of options) {
            selected.add(option.name);
          }
        }
        render();
        return;
      }

      if (key.name === "return") {
        if (selected.size === 0) {
          render();
          process.stdout.write("\nSelect at least one agent.\n");
          return;
        }

        cleanup();
        process.stdout.write("\x1b[2J\x1b[H");
        resolve([...selected]);
      }
    };

    process.stdin.on("keypress", onKeypress);
    render();
  });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
