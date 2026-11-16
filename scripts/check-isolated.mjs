import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { MongoClient } from "mongodb";

const checks = {
  sessions: "check-sessions.mjs",
  navigation: "check-navigation.mjs",
  accessibility: "check-accessibility.mjs",
  limits: "check-rate-limits.mjs",
  spam: "check-spam-protection.mjs",
  booking: "check-booking-wizard.mjs",
  motion: "check-public-motion.mjs",
  seo: "check-seo.mjs",
};
const production = process.argv.includes("--production");
const requested = process.argv.slice(2).filter((argument) => argument !== "--production");
assert.ok(requested.length && requested.every((name) => checks[name]),
  `Choose checks: ${Object.keys(checks).join(", ")}`);
const root = resolve(import.meta.dirname, "..");
const uri = process.env.PARTIERS_TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(uri).hostname), "Local test MongoDB required.");
const dbName = `partiers_test_${randomBytes(12).toString("hex")}`;
const port = process.env.PARTIERS_TEST_PORT ?? "3100";
assert.match(port, /^\d+$/);
const baseURL = `http://127.0.0.1:${port}`;
const environment = {
  ...process.env,
  NODE_ENV: production ? "production" : "development",
  VERCEL: "",
  MONGODB_URI: uri,
  MONGODB_DB: dbName,
  ADMIN_SESSION_SECRET: randomBytes(32).toString("hex"),
  PARTIERS_TEST_URL: baseURL,
};
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
let snapshot;
let server;
let serverLog = "";
let connected = false;

function run(script) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [join(root, "scripts", script)], {
      cwd: root, env: environment, stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`${script} failed (${code}).`)));
  });
}

try {
  await client.db("admin").command({ ping: 1 });
  connected = true;
  // A source snapshot keeps the owner's running server and .env.local untouched.
  snapshot = await mkdtemp(join(tmpdir(), "partiers-check-"));
  for (const path of ["src", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "AGENTS.md"])
    await cp(join(root, path), join(snapshot, path), { recursive: true });
  await cp(join(root, "public"), join(snapshot, "public"), { recursive: true }).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await symlink(join(root, "node_modules"), join(snapshot, "node_modules"), "dir");
  const next = join(root, "node_modules/next/dist/bin/next");
  if (production) {
    console.log("Building the isolated production site (webpack).");
    await new Promise((resolveBuild, reject) => {
      const build = spawn(process.execPath, [next, "build", snapshot, "--webpack"], {
        cwd: snapshot, env: environment, stdio: "inherit",
      });
      build.once("error", reject);
      build.once("exit", (code) => code === 0 ? resolveBuild() : reject(new Error(`Isolated production build failed (${code}).`)));
    });
  }
  server = spawn(process.execPath, [next, production ? "start" : "dev", snapshot,
    ...(!production ? ["--webpack"] : []), "--hostname", "127.0.0.1", "--port", port], {
    cwd: snapshot, env: environment, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
  });
  server.on("error", (error) => { serverLog += error.message; });
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (chunk) => { serverLog = (serverLog + chunk).slice(-16000); });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("Isolated server exited before it was ready.");
    if (!serverLog.includes("Ready in")) { await delay(250); continue; }
    try {
      const response = await fetch(`${baseURL}/about`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Still starting. */ }
    await delay(250);
  }
  assert.ok(ready, "Isolated server did not become ready.");
  // Only this child process reporting readiness can authorize fixture writes.
  assert.equal(server.exitCode, null);
  console.log("Running browser checks against a temporary local database and source snapshot.");
  for (const name of requested) await run(checks[name]);
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  if (server?.pid && server.exitCode === null) {
    const stopped = new Promise((resolveStop) => server.once("exit", resolveStop));
    if (process.platform === "win32") server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
    await stopped;
  }
  if (connected) await client.db(dbName).dropDatabase();
  await client.close();
  if (snapshot) await rm(snapshot, { recursive: true, force: true });
  console.log("Removed the temporary test database and source snapshot.");
}
