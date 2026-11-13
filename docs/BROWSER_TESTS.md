# Browser verification

The workbench test exercises real audio and transcript inputs and exports, then checks a 390px viewport for horizontal overflow and collects uncaught browser errors. Two regressions delay a transcript file read and verify that Clear desk and Load demo each cancel the pending result. No API key or model service is required.

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Playwright starts the local Vite server automatically. Desktop/mobile screenshots and failure traces are written to ignored `test-results/`; the HTML report is in `playwright-report/`. To use an already running server, set `PLAYWRIGHT_BASE_URL`. To use installed Chrome, set `PLAYWRIGHT_CHANNEL=chrome`. The default CI browser is Playwright Chromium.

These tests are intentionally scoped to the documented workbench workflow. They do not establish all-browser compatibility, universal input support, or the correctness of arbitrary AI output. The README screenshot is from the real local application using synthetic data.
