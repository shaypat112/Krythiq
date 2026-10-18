import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ESLint } from "eslint";

const require = createRequire(import.meta.url);
const plugin = require("@next/eslint-plugin-next");
const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs.js");

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "krythiq-eslint-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of ["web", "admin"]) {
    mkdirSync(path.join(root, "apps", name, "pages"), { recursive: true });
    writeFileSync(path.join(root, "apps", name, "pages", "about.js"), "");
  }
  return root;
}

test("Next.js lint resolves literal, glob, array, missing, and Windows-style root directories", (t) => {
  const cwd = fixture(t);
  const web = path.join(cwd, "apps", "web");
  const admin = path.join(cwd, "apps", "admin");
  const resolve = (rootDir) => getRootDirs({ cwd, settings: { next: { rootDir } } }).sort();
  assert.deepEqual(resolve(undefined), [cwd]);
  assert.deepEqual(resolve(web), [web]);
  assert.deepEqual(resolve(`${web}/`), [web]);
  assert.deepEqual(resolve(web.replaceAll("/", "\\")), [web]);
  assert.deepEqual(resolve(path.join(cwd, "apps", "*")), [admin, web]);
  assert.deepEqual(resolve(path.join(cwd, "apps", "{web,admin}")), [admin, web]);
  assert.deepEqual(resolve([admin, web, false]), [admin, web]);
  assert.deepEqual(resolve(path.join(cwd, "missing")), []);
  assert.deepEqual(resolve(path.join(web, "pages", "about.js")), []);
});

test("Next.js lint still detects internal anchor navigation through a configured root glob", async (t) => {
  const cwd = fixture(t);
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: [{
      files: ["**/*.jsx"],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { "@next/next": plugin },
      settings: { next: { rootDir: path.join(cwd, "apps", "*") } },
      rules: { "@next/next/no-html-link-for-pages": "error" },
    }],
  });
  const [result] = await eslint.lintText('const link = <a href="/about">About</a>;', {
    filePath: path.join(cwd, "example.jsx"),
  });
  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "@next/next/no-html-link-for-pages");
});
