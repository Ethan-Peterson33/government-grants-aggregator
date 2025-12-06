#!/usr/bin/env node
const { execSync } = require("node:child_process");
const { rmSync, existsSync } = require("node:fs");
const path = require("node:path");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

const isCi = process.env.CI === "true" || process.env.VERCEL === "1";

const logIntegrityRecovery = () => {
  console.warn(
    "[ci-build] EINTEGRITY detected. Cleaning npm cache, deleting node_modules and package-lock.json, then reinstalling..."
  );
};

const removePathIfExists = (targetPath) => {
  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }
};

const cleanInstall = () => {
  try {
    run("npm cache clean --force");
  } catch (error) {
    console.warn("[ci-build] npm cache clean failed; continuing.");
  }

  removePathIfExists(path.join(process.cwd(), "node_modules"));
  removePathIfExists(path.join(process.cwd(), "package-lock.json"));

  run("npm install");
};

const tryInstallWithIntegrityFallback = () => {
  try {
    run("npm cache verify");
  } catch (error) {
    console.warn("[ci-build] npm cache verify failed; continuing with install.");
  }

  try {
    run("npm install");
    return;
  } catch (error) {
    const errorText = `${error?.message ?? ""} ${error?.stderr?.toString?.() ?? ""}`;
    const integrityFailure = errorText.includes("EINTEGRITY") || errorText.includes("integrity checksum failed");

    if (!integrityFailure) {
      throw error;
    }

    logIntegrityRecovery();
    cleanInstall();
  }
};

if (isCi) {
  console.log("[ci-build] CI environment detected; performing integrity-aware install.");
  tryInstallWithIntegrityFallback();
} else {
  console.log("[ci-build] Local environment detected; skipping CI integrity guard install.");
}

console.log("[ci-build] Running Next.js build...");
run("next build");
