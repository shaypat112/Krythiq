import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: "utf8", stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(capture ? result.stderr : `${command} exited with ${result.status}`);
  return result.stdout;
}

function localEnv() {
  const status = JSON.parse(run("supabase", ["status", "-o", "json"], true));
  if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error("Local Supabase credentials are missing.");
  return {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  };
}

try {
  const action = process.argv[2] ?? "up";
  if (action === "up") {
    run("supabase", ["start"], true);
    console.log("Local Supabase services are ready.");
    const env = localEnv();
    writeFileSync(`${root}.env.docker`, Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600 });
    run("docker", ["compose", "up", "--build", "-d", "--wait", "frontend"]);
    console.log("App: http://localhost:3000\nDatabase Studio: http://localhost:54323\nLocal mail: http://localhost:54324\nPostgres: localhost:54322 (postgres/postgres)");
  } else if (action === "down") {
    run("docker", ["compose", "down"]);
    run("supabase", ["stop"]);
  } else if (action === "status") {
    // Avoid printing API secrets during routine status checks.
    run("docker", ["ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"]);
  } else if (action === "test") {
    const env = localEnv();
    for (const file of ["production-schema-smoke.mjs", "production-crud-smoke.mjs", "local-stack-smoke.mjs"]) {
      const result = spawnSync(process.execPath, [`tests/database/${file}`], { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
      if (result.status !== 0) throw new Error(`${file} failed`);
    }
  } else throw new Error(`Unknown action: ${action}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
