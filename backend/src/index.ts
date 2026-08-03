#!/usr/bin/env node
import fs from "fs";
import { fileURLToPath } from "url";
import { runCli } from "./cli.js";
export { defineConfig } from "./config.js";

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  void runCli();
}
