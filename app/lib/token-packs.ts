export const TOKEN_PACKS = {
  starter: {
    id: "starter",
    name: "Starter",
    tokens: 250,
    description: "A lightweight top-up for a few repository scans.",
    priceEnv: "STRIPE_PRICE_TOKENS_250",
  },
  builder: {
    id: "builder",
    name: "Builder",
    tokens: 750,
    description: "A practical balance for regular security reviews.",
    priceEnv: "STRIPE_PRICE_TOKENS_750",
  },
  scale: {
    id: "scale",
    name: "Scale",
    tokens: 2000,
    description: "A larger balance for deep scans across multiple repositories.",
    priceEnv: "STRIPE_PRICE_TOKENS_2000",
  },
} as const;

export type TokenPackId = keyof typeof TOKEN_PACKS;

export function isTokenPackId(value: unknown): value is TokenPackId {
  return typeof value === "string" && value in TOKEN_PACKS;
}

export function getConfiguredTokenPack(id: TokenPackId) {
  const pack = TOKEN_PACKS[id];
  const priceId = process.env[pack.priceEnv]?.trim() ?? "";
  return priceId ? { ...pack, priceId } : null;
}
