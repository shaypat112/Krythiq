import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import stripAnsi from "strip-ansi";

export async function writeReport(destination: string, content: string, overwrite = false) {
  const absolute = path.resolve(destination);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = path.join(path.dirname(absolute), `.krythiq-report-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, stripAnsi(content), { flag: "wx", mode: 0o600 });
    if (overwrite) await fs.rename(temporary, absolute);
    else await fs.link(temporary, absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Output file already exists. Choose another path or use --overwrite.");
    throw error;
  } finally {
    await fs.unlink(temporary).catch(() => undefined);
  }
}
