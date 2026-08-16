import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalogSource = await readFile(new URL("../../app/lib/notifications/catalog.ts", import.meta.url), "utf8");
const migrationSource = await readFile(new URL("../../supabase/migrations/20260816010000_database_reliability_repair.sql", import.meta.url), "utf8");

function ids(source, arrayName) {
  const section = source.match(new RegExp(`export const ${arrayName} = \\[([\\s\\S]*?)\\] as const;`));
  assert.ok(section, `${arrayName} must remain a literal array so its database contract can be tested`);
  return [...section[1].matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
}

test("every app notification event is accepted by the repair migration", () => {
  for (const event of ids(catalogSource, "notificationEvents")) {
    assert.match(migrationSource, new RegExp(`'${event.replaceAll(".", "\\.")}'`), `missing event: ${event}`);
  }
});

test("every app notification channel is accepted by the repair migration", () => {
  for (const channel of ids(catalogSource, "notificationChannels")) {
    assert.match(migrationSource, new RegExp(`'${channel}'`), `missing channel: ${channel}`);
  }
});

test("preference upserts retain the exact PostgREST conflict key", () => {
  assert.match(migrationSource, /unique nulls not distinct\s*\(user_id, team_id, channel, event\)/i);
  assert.match(migrationSource, /for all to authenticated/i);
  assert.match(migrationSource, /grant select, insert, update, delete on public\.notification_preferences to authenticated/i);
});
