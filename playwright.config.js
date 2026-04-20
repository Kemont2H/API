// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Базовый URL для всех тестов
  use: {
    baseURL: 'https://apichallenges.eviltester.com',
    extraHTTPHeaders: {
      'X-CHALLENGER': 'bf5989bc-4ad4-4bef-a20a-54bd0d1f9873',  
    },
  },
  
  // Где искать тесты
  testDir: './',
  testMatch: '**/*.spec.js',
  
  // Таймауты
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  
  // Количество параллельных тестов
  workers: 1,
  
  // Репортёры
  reporter: [['html'], ['line']],
});