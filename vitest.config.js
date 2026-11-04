import {defineConfig, mergeConfig} from 'vitest/config';
import base from './vite.config.js';

export default mergeConfig(base, defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests-ui/**/*.test.{js,jsx}'],
    setupFiles: ['./tests-ui/setup.js'],
    restoreMocks: true,
    css: {modules: {classNameStrategy: 'non-scoped'}}
  }
}));
