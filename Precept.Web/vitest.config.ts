import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Unit and component tests (M1-F9). Kept separate from vite.config.ts so test runs do not
// pull in the dev-server proxy, chunking and Tailwind plugin settings.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
});
