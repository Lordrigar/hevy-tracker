import { existsSync } from 'node:fs';

const required = ['apps/api/src/main.ts', 'apps/web/src/main.tsx', 'docker-compose.yml'];
const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`Architecture check failed: missing ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Architecture check passed: Task 1 runtime boundaries are present.');
