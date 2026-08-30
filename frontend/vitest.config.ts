import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 仕様ベースのテスト実行設定 (npm test)
// 本番ビルド(tsc -b && vite build)には影響しない
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
