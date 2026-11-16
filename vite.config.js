import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { include: ['tests/**/*.test.js'], testTimeout: 20000, fileParallelism: false },
});
