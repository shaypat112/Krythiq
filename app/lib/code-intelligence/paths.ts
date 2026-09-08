import path from "node:path";

export function normalizeProjectPath(value: string) {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return path.posix.normalize(normalized).replace(/^\.\//, "");
}

export function lineAt(source: string, position: number) {
  return source.slice(0, position).split("\n").length;
}
