import { readFileSync } from "node:fs";

const ignored = readFileSync(".gitignore", "utf8");
if (!ignored.includes(".env") || !ignored.includes("!.env.example")) {
  console.error("Security check failed: .env must be ignored while .env.example is tracked.");
  process.exit(1);
}
console.log("Security check passed: environment secrets are protected by repository rules.");
