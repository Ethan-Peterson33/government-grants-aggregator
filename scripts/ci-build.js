#!/usr/bin/env node
const { execSync } = require("node:child_process");
const { rmSync, existsSync } = require("node:fs");
const path = require("node:path");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

const isCi = process.env.CI === "true" || process.env.VERCEL === "1";

if (isCi) {
  console.log("[ci-build] CI environment detected; verifying cache and reinstalling dependencies for integrity...");
  try {
    run("npm cache verify");
  } catch (error) {
    console.warn("[ci-build] npm cache verify failed; continuing with cache clean.");
  }
  try {
    run("npm cache clean --force");
  } catch (error) {
    console.warn("[ci-build] npm cache clean failed; continuing.");
  }

  const nodeModulesPath = path.join(process.cwd(), "node_modules");
  if (existsSync(nodeModulesPath)) {
    console.log("[ci-build] Removing node_modules to force a clean install.");
    rmSync(nodeModulesPath, { recursive: true, force: true });
  }

  const lockfilePath = path.join(process.cwd(), "package-lock.json");
  if (existsSync(lockfilePath)) {
    console.log("[ci-build] Removing package-lock.json to regenerate lockfile if needed.");
    rmSync(lockfilePath, { force: true });
  }

  console.log("[ci-build] Installing dependencies from scratch...");
  run("npm install");
} else {
  console.log("[ci-build] Local environment detected; skipping cache clean for developer installs.");
}

console.log("[ci-build] Running Next.js build...");
run("next build");
