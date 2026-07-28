import { defineConfig } from "krythiq";

export default defineConfig({
  // AI model for trace analysis
  model: "claude-sonnet-4-20250514",

  // Stack trace analysis settings
  traces: {
    enabled: true,
    // Minimum confidence to display (0-100)
    minConfidence: 70,
    // Show fix suggestions
    showFix: true,
  },

  // Security scanning settings
  scan: {
    // Glob patterns to ignore
    ignore: ["node_modules/**", ".next/**", "dist/**", "build/**"],
    // Auto-fix safe issues
    autoFix: false,
  },

  // Slop detection settings  
  slop: {
    enabled: true,
    // Flag imports that don't exist in npm
    checkImports: true,
  },
});
