import {defineConfig}from '@playwright/test';
const external=process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir:'./e2e',testMatch:'**/*.browser.mjs',timeout:180000,
  expect:{timeout:10000},workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:external||'http://127.0.0.1:4173',viewport:{width:1440,height:1100},
    browserName:'chromium',channel:process.env.PLAYWRIGHT_CHANNEL||undefined,
    acceptDownloads:true,trace:'retain-on-failure'},
  webServer:external?undefined:{command:'npm run dev -- --port 4173 --strictPort',
    url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:120000}
});
