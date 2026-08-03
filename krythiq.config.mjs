import { defineConfig } from
  "krythiq";

export default defineConfig({
  model: "claude-sonnet-4-20250514",
  traces: { enabled: true },
  scan: {
    ignore: ["node_modules/**", ".next/**", "dist/**", "build/**"],
    ai: false,
    aiModel: "mistral-large-latest",
    publish: false,
  },
});
