import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * ============================================================================
 *  Configuración de la suite de tests
 * ============================================================================
 *  Entorno `node`, no `jsdom`: lo que se prueba aquí es el MODELO (física,
 *  terreno, munición, IA, máquina de turnos), que por diseño no conoce ni
 *  React ni Three.js. Los tests corren en milisegundos y no necesitan DOM.
 *
 *  Si en el futuro se prueban componentes, añádase un segundo proyecto con
 *  `environment: 'jsdom'` en vez de cambiar este.
 * ============================================================================
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['components/game-engine/**/*.ts'],
    },
  },
})
