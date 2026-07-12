import { defineConfig } from 'vite';

// GitHub Pages などサブパス配信時は VITE_BASE=/<repo>/ をビルド時に渡す。
// 開発サーバー (npm run dev) では未設定なので '/' になる。
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
