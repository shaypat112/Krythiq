import { globSync as tinyGlobSync } from "tinyglobby";
import path from "node:path";

// @next/eslint-plugin-next uses only this API to resolve settings.next.rootDir.
// Keep literal directory matching compatible with fast-glob, without its
// vulnerable micromatch -> braces dependency chain.
export const globSync = (patterns, options = {}) =>
  tinyGlobSync(patterns, {
    absolute: typeof patterns === "string" && path.isAbsolute(patterns),
    ...options,
    expandDirectories: false,
  }).map((entry) => entry.replace(/\/$/, "") || "/");
