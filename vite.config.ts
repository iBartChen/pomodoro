import { defineConfig } from 'vite';

export default defineConfig({
  // 這裡必須對應 https://ibartchen.github.io/pomodoro/ 中的 /pomodoro/
  base: '/pomodoro/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});