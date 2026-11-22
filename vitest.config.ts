// Tests are the files under tests/. Working copies made for helpers during a session (under
// .claude/) hold copies of them, and are not this repository's to run.
// Cloudflare's build machine is slower than a desk: some tests that take four seconds here went
// past vitest's default of five there, and a failed test stops the deploy.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 30000, include: ['tests/**/*.test.ts'], exclude: ['**/node_modules/**', '**/.claude/**', '**/dist/**'] },
});
