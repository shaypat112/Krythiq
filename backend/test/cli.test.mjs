import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = path.resolve("dist/index.js");

function run(args, cwd = process.cwd()) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

test("help starts without requiring a writable credential store", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Commands:/);
  assert.match(result.stdout, /connect/);
  assert.match(result.stdout, /whoami/);
  assert.match(result.stdout, /token/);
});

test("whoami is registered as a standalone command", () => {
  const result = run(["whoami", "--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /show which Krythiq\.dev account/);
});

test("CLI starts through a package-manager-style binary symlink", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "krythiq-bin-"));
  const binary = path.join(root, "krythiq");
  await symlink(cli, binary);
  const result = spawnSync(binary, ["--version"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), JSON.parse(await readFile("package.json", "utf8")).version);
});

test("scan save and token commands are registered", () => {
  const scanHelp = run(["scan", "--help"]);
  assert.equal(scanHelp.status, 0, scanHelp.stderr);
  assert.match(scanHelp.stdout, /--save/);
  const tokenHelp = run(["token", "--help"]);
  assert.equal(tokenHelp.status, 0, tokenHelp.stderr);
  assert.match(tokenHelp.stdout, /show the Token balance/);
});

test("scan emits valid JSON and custom-rule findings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "krythiq-test-"));
  await mkdir(path.join(root, ".krythiq"));
  await writeFile(path.join(root, "sample.js"), "dangerousFunction();\n");
  await writeFile(path.join(root, ".krythiq", "rules.json"), JSON.stringify({
    patterns: [{ pattern: "dangerousFunction\\(", severity: "high", type: "CUSTOM_CALL", message: "Unsafe call" }],
  }));

  const result = run(["scan", ".", "--format", "json"], root);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.findings.length, 1);
  assert.equal(body.findings[0].type, "CUSTOM_CALL");

  const ciFailure = run(["scan", ".", "--ci", "--fail-on", "high", "--format", "json"], root);
  assert.equal(ciFailure.status, 1);

  const higherThreshold = run(["scan", ".", "--ci", "--fail-on", "critical", "--format", "json"], root);
  assert.equal(higherThreshold.status, 0);
});

test("scan rejects invalid modes and missing directories", () => {
  const invalidMode = run(["scan", "--format", "xml"]);
  assert.notEqual(invalidMode.status, 0);
  assert.match(invalidMode.stderr, /Allowed choices/);

  const missing = run(["scan", "does-not-exist"]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /not a directory/);
});

test("run preserves shell quoting and child exit codes", () => {
  const success = run(["run", `${process.execPath} -e \"console.log('hello world')\"`, "--no-ai"]);
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /hello world/);

  const failure = run(["run", `${process.execPath} -e \"process.exit(7)\"`, "--no-ai"]);
  assert.equal(failure.status, 7);
});

async function scanFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "krythiq-artifact-"));
  await mkdir(path.join(root, ".krythiq"));
  await writeFile(path.join(root, "sample.js"), "dangerousFunction();\n");
  await writeFile(path.join(root, ".krythiq", "rules.json"), JSON.stringify({
    patterns: [{ pattern: "dangerousFunction\\(", severity: "high", type: "CUSTOM_CALL", message: "Unsafe | call" }],
  }));
  return root;
}

const localOnly = ["--no-semgrep", "--no-audit"];

test("scan writes reusable JSON reports, preserves existing files, and supports explicit replacement", async () => {
  const root = await scanFixture();
  const destination = path.join(root, "artifacts", "scan.json");
  const first = run(["scan", ".", ...localOnly, "--format", "json", "--output", destination], root);
  assert.equal(first.status, 0, first.stderr);
  const { readFile, stat } = await import("node:fs/promises");
  const original = await readFile(destination, "utf8");
  assert.deepEqual(JSON.parse(original), JSON.parse(first.stdout));
  assert.equal(JSON.parse(original).findings[0].type, "CUSTOM_CALL");
  if (process.platform !== "win32") assert.equal((await stat(destination)).mode & 0o077, 0);
  const duplicate = run(["scan", ".", ...localOnly, "--format", "json", "--output", destination], root);
  assert.equal(duplicate.status, 2);
  assert.match(duplicate.stderr, /--overwrite/);
  assert.equal(await readFile(destination, "utf8"), original);
  const replacement = run(["scan", ".", ...localOnly, "--format", "markdown", "--output", destination, "--overwrite"], root);
  assert.equal(replacement.status, 0, replacement.stderr);
  assert.match(await readFile(destination, "utf8"), /^# Krythiq Scan Report/);
});

test("CI writes artifacts before returning a failing severity status", async () => {
  const root = await scanFixture();
  const destination = path.join(root, "scan.json");
  const result = run(["scan", ".", ...localOnly, "--format", "json", "--output", destination, "--ci"], root);
  assert.equal(result.status, 1, result.stderr);
  const { readFile } = await import("node:fs/promises");
  assert.equal(JSON.parse(await readFile(destination, "utf8")).findings.length, 1);
});

test("report converts saved evidence to SARIF and escapes Markdown table cells", async () => {
  const root = await scanFixture();
  run(["scan", ".", ...localOnly, "--format", "json", "--output", "scan.json"], root);
  // Remove source input: the report command must operate on the artifact alone.
  const { unlink } = await import("node:fs/promises");
  await unlink(path.join(root, "sample.js"));
  const sarif = run(["report", "scan.json", "--format", "sarif"], root);
  assert.equal(sarif.status, 0, sarif.stderr);
  const body = JSON.parse(sarif.stdout);
  assert.equal(body.version, "2.1.0");
  assert.equal(body.runs[0].results[0].level, "error");
  const markdown = run(["report", "scan.json", "--format", "markdown"], root);
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.match(markdown.stdout, /Unsafe \\\| call/);
});

test("report display filters cannot hide evidence from CI", async () => {
  const root = await scanFixture();
  run(["scan", ".", ...localOnly, "--format", "json", "--output", "scan.json"], root);
  const result = run(["report", "scan.json", "--min-severity", "critical", "--ci", "--fail-on", "high", "--format", "json"], root);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).findings.length, 0);
});

test("report rejects malformed evidence and unreadable destinations", async () => {
  const root = await scanFixture();
  await writeFile(path.join(root, "bad.json"), JSON.stringify({ findings: [{ severity: "__proto__" }] }));
  const invalid = run(["report", "bad.json", "--format", "json"], root);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Invalid finding/);
  const directory = run(["report", "."], root);
  assert.equal(directory.status, 2);
  const missing = run(["report", "missing.json"], root);
  assert.equal(missing.status, 2);
});

test("doctor emits local diagnostics without exposing environment credentials", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "krythiq-doctor-"));
  const result = spawnSync(process.execPath, [cli, "doctor", root, "--format", "json"], {
    encoding: "utf8",
    env: { ...process.env, PATH: "", NO_COLOR: "1", ANTHROPIC_API_KEY: "private-anthropic-sentinel", MISTRAL_API_KEY: "private-mistral-sentinel" },
  });
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.ok(body.checks.some(check => check.name === "Semgrep" && check.status === "warn"));
  assert.doesNotMatch(result.stdout + result.stderr, /private-anthropic-sentinel|private-mistral-sentinel/);
  const strict = spawnSync(process.execPath, [cli, "doctor", root, "--strict", "--format", "json"], { encoding: "utf8", env: { ...process.env, PATH: "", NO_COLOR: "1" } });
  assert.equal(strict.status, 1);
  assert.equal(JSON.parse(strict.stdout).ok, false);
  const missing = run(["doctor", path.join(root, "missing"), "--format", "json"]);
  assert.equal(missing.status, 1);
  assert.ok(JSON.parse(missing.stdout).checks.some(check => check.status === "fail"));
});

test("dashboard save failures stay on stderr without corrupting JSON evidence", async () => {
  const root = await scanFixture();
  const result = spawnSync(process.execPath, [cli, "scan", ".", ...localOnly, "--format", "json", "--save"], {
    cwd: root, encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", KRYTHIQ_CLI_TOKEN: "local-test-token", KRYTHIQ_DASHBOARD_URL: "http://127.0.0.1:1" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).findings.length, 1);
  assert.match(result.stderr, /Scan was not saved/);
});
