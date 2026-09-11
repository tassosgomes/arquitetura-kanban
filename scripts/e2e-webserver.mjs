import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

/**
 * Serves the standalone Next build for Playwright (output: "standalone"
 * cannot use `next start`). Same layout as the production Docker image.
 */
const root = process.cwd();
const host = process.env.HOSTNAME ?? "127.0.0.1";
const port = process.env.PORT ?? "3000";
const standaloneDir = path.join(root, ".next/standalone");
const serverJs = path.join(standaloneDir, "server.js");

if (!existsSync(serverJs)) {
  console.error("Missing .next/standalone/server.js. Run `npm run build` before `npm run test:e2e`.");
  process.exit(1);
}

const staticSrc = path.join(root, ".next/static");
const staticDest = path.join(standaloneDir, ".next/static");
if (existsSync(staticSrc)) {
  mkdirSync(path.dirname(staticDest), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
}

const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

const child = spawn(process.execPath, ["server.js"], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: host,
    PORT: String(port),
  },
});

const stop = () => {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
