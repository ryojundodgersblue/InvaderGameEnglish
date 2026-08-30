import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// globals:false 構成では自動cleanupが効かないため明示する
afterEach(() => {
  cleanup()
})
