import { spawn } from "node:child_process";

if (process.env.LIVARIANT_REAL_PROVIDER_ACCEPTANCE !== "1") {
  throw new Error("Real provider acceptance is opt-in. Set LIVARIANT_REAL_PROVIDER_ACCEPTANCE=1.");
}

const provider = process.argv[2]?.trim();
const scripts = {
  codex: "scripts/real-codex-project-isolation-acceptance.mjs",
  claude: "scripts/real-claude-project-isolation-acceptance.mjs",
  gemini: "scripts/real-gemini-project-isolation-acceptance.mjs",
};

if (provider && !(provider in scripts)) {
  throw new Error("Usage: npm run acceptance:real-provider-project-isolation -- [codex|claude|gemini]");
}

const selected = provider ? [provider] : ["codex", "claude", "gemini"];
const results = [];

for (const name of selected) {
  const script = scripts[name];
  const result = await new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script], {
      shell: false,
      windowsHide: true,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
  results.push({ provider: name, ...result });
  if (result.code !== 0) {
    process.stderr.write(`[${name}] real-provider acceptance failed.\n${result.stderr}\n${result.stdout}\n`);
  }
}

const failed = results.filter((result) => result.code !== 0);
process.stdout.write(JSON.stringify({
  schemaVersion: 1,
  state: failed.length === 0 ? "passed" : "failed",
  providers: results.map((result) => ({
    provider: result.provider,
    passed: result.code === 0,
  })),
}, null, 2) + "\n");

if (failed.length > 0) process.exitCode = 1;
