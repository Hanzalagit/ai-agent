import { spawn } from "node:child_process";

export type LocalAppResult = {
  ok: boolean;
  app: string;
  message: string;
};

export type CommandResult = {
  ok: boolean;
  command: string;
  exitCode: number | null;
  output: string;
};

const COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 4000;

const BLOCKED_COMMAND_PATTERNS: RegExp[] = [
  /\bformat\b/i,
  /\bdiskpart\b/i,
  /\bshutdown\b/i,
  /\brecovery\b.*\bdrive\b/i,
  /del\s+\/[fqs].*?[a-z]:\\/i,
  /rd\s+\/s\/q\s+[a-z]:\\$/i,
  /\brm\s+-rf\s+\/(\s|$)/i,
  /\bcipher\b\s+\/w/i,
];

export function isLocalAgentEnabled(): boolean {
  return process.env.LOCAL_AGENT_ENABLED !== "false";
}

export function isShellEnabled(): boolean {
  return (
    isLocalAgentEnabled() && process.env.ENABLE_SHELL_COMMANDS !== "false"
  );
}

type AppEntry = {
  commands: string[];
  args?: string[];
  label: string;
};

const APP_WHITELIST: Record<string, AppEntry> = {
  notepad: { commands: ["notepad.exe"], label: "Notepad" },
  calculator: { commands: ["calc.exe"], label: "Calculator" },
  calc: { commands: ["calc.exe"], label: "Calculator" },
  paint: { commands: ["mspaint.exe"], label: "Paint" },
  explorer: { commands: ["explorer.exe"], label: "File Explorer" },
  files: { commands: ["explorer.exe"], label: "File Explorer" },
  cmd: { commands: ["cmd.exe"], label: "Command Prompt" },
  terminal: { commands: ["wt.exe"], label: "Windows Terminal" },
  powershell: { commands: ["powershell.exe"], label: "PowerShell" },
  taskmanager: { commands: ["taskmgr.exe"], label: "Task Manager" },
  settings: { commands: ["ms-settings:"], label: "Windows Settings" },
  chrome: {
    commands: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
    label: "Google Chrome",
  },
  edge: { commands: ["msedge.exe"], label: "Microsoft Edge" },
  firefox: { commands: ["firefox.exe"], label: "Firefox" },
  vscode: { commands: ["code.cmd"], label: "VS Code" },
  code: { commands: ["code.cmd"], label: "VS Code" },
  spotify: { commands: ["spotify.exe"], label: "Spotify" },
  whatsapp: { commands: ["whatsapp:"], label: "WhatsApp Desktop" },
  word: { commands: ["winword.exe"], label: "Microsoft Word" },
  excel: { commands: ["excel.exe"], label: "Microsoft Excel" },
};

export function listKnownApps(): string[] {
  return Object.keys(APP_WHITELIST).sort();
}

export async function openWebsite(
  rawUrl: string
): Promise<LocalAppResult> {
  let url = rawUrl.trim().replace(/[\r\n\t"]/g, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, app: url, message: `"${rawUrl}" is not a valid URL.` };
  }
  if (!/^https?:$/.test(parsed.protocol) || url.length > 2000) {
    return { ok: false, app: url, message: "URL scheme not allowed." };
  }

  try {
    const child = spawn("cmd.exe", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      shell: false,
      windowsVerbatimArguments: false,
    });
    child.unref();
    return {
      ok: true,
      app: url,
      message: `Opened ${parsed.hostname} in the default browser.`,
    };
  } catch {
    return {
      ok: false,
      app: url,
      message: "Could not open the browser on this PC.",
    };
  }
}

export async function openLocalApp(name: string): Promise<LocalAppResult> {
  const key = name.toLowerCase().trim().replace(/\s+/g, "");
  const entry = APP_WHITELIST[key] ?? APP_WHITELIST[name.toLowerCase().trim()];

  if (!entry) {
    return {
      ok: false,
      app: name,
      message: `"${name}" is not in the allowed apps whitelist. Known apps: ${listKnownApps().join(", ")}.`,
    };
  }

  for (const command of entry.commands) {
    try {
      const isUri = /[:]/.test(command) && !command.includes("\\") && !command.endsWith(".exe") && !command.endsWith(".cmd");
      const child = isUri
        ? spawn("cmd.exe", ["/c", "start", "", command], {
            detached: true,
            stdio: "ignore",
            shell: false,
          })
        : spawn(command, entry.args ?? [], {
            detached: true,
            stdio: "ignore",
            shell: true,
          });
      child.unref();
      return { ok: true, app: entry.label, message: `${entry.label} launched successfully.` };
    } catch {
      continue;
    }
  }

  return {
    ok: false,
    app: entry.label,
    message: `${entry.label} could not be launched — it may not be installed on this PC.`,
  };
}

export async function runShellCommand(
  command: string,
  cwd?: string
): Promise<CommandResult> {
  const trimmed = command.trim();

  if (!trimmed) {
    return {
      ok: false,
      command: command,
      exitCode: null,
      output: "Empty command.",
    };
  }

  if (trimmed.length > 1000) {
    return {
      ok: false,
      command: trimmed.slice(0, 200),
      exitCode: null,
      output: "Command too long (max 1000 characters).",
    };
  }

  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        command: trimmed,
        exitCode: null,
        output:
          "Blocked: this command looks destructive and is not allowed by the agent's safety rules.",
      };
    }
  }

  let workingDir = process.cwd();
  if (cwd && typeof cwd === "string" && cwd.trim()) {
    try {
      const { resolve } = await import("node:path");
      const { existsSync, statSync } = await import("node:fs");
      const resolved = resolve(cwd.trim());
      if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
        return {
          ok: false,
          command: trimmed,
          exitCode: null,
          output: `Working directory "${cwd}" does not exist.`,
        };
      }
      workingDir = resolved;
    } catch {

    }
  }

  return new Promise<CommandResult>((resolve) => {
    let output = "";
    let settled = false;

    const child = spawn("cmd.exe", ["/d", "/s", "/c", trimmed], {
      cwd: workingDir,
      shell: false,
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      if (!settled) {
        child.kill();
        settled = true;
        resolve({
          ok: false,
          command: trimmed,
          exitCode: null,
          output:
            truncate(output) +
            "\n[Timed out after 30 seconds — process killed.]",
        });
      }
    }, COMMAND_TIMEOUT_MS);

    const collect = (chunk: Buffer | string) => {
      if (output.length < MAX_OUTPUT_CHARS * 2) {
        output += chunk.toString();
      }
    };

    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        command: trimmed,
        exitCode: null,
        output: `Failed to start command: ${err.message}`,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: true,
        command: trimmed,
        exitCode: code,
        output: truncate(output) || "(no output)",
      });
    });
  });
}

function truncate(text: string): string {
  return text.length > MAX_OUTPUT_CHARS
    ? text.slice(0, MAX_OUTPUT_CHARS) + "\n[output truncated]"
    : text;
}
