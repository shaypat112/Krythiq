import Conf from "conf";

const store = new Conf<{ apiKey?: string }>({ projectName: "krythiq" });

export async function getApiKey(): Promise<string | undefined> {
  return process.env.ANTHROPIC_API_KEY ?? store.get("apiKey");
}
