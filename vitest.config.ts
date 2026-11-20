// Tests are the files under tests/. Working copies made for helpers during a session (under
// .claude/) hold copies of them, and are not this repository's to run.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], exclude: ['**/node_modules/**', '**/.claude/**', '**/dist/**'] },
});
