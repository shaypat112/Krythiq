import Conf from "conf";

export async function getApiKey(): Promise<string | undefined> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    return new Conf<{ apiKey?: string }>({ projectName: "krythiq" }).get("apiKey");
  } catch {
    return undefined;
  }
}
