import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
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
  assert.equal(result.stdout.trim(), "0.2.2");
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
