import { defineConfig } from 'vite';

export default defineConfig({
  // 由於已綁定自定義網域 pomodoro.bartchen.com，路徑應改為根目錄 '/'
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
