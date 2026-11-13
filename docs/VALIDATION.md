# Validation record

Verified on 13 November 2026 (Europe/Istanbul), using Windows, Node.js 24.18.0, npm, and actual Chrome through Playwright 1.65.0.

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Unit tests | 37 passed |
| Production build | Passed |
| Browser workflows | 3 passed: review/export at a 390px viewport, plus pending transcript reads canceled by Clear and Demo |
| Runtime errors | No uncaught application errors in the tested flow |
| Production dependency audit | No known vulnerabilities reported by npm at check time |

The browser suite is committed in `e2e/workbench.browser.mjs`. See [Browser tests](BROWSER_TESTS.md) to reproduce it. The README screenshot is captured from the actual local application with synthetic inputs. Unit-test fixtures and builtin policy/parser results are labeled as synthetic/reference examples, not live model benchmarks.

This record covers the implemented workflow and tested inputs. It is not an all-browser certification, a guarantee about arbitrary documents or AI output, or an assurance against future dependency advisories. The production deployment is documented separately in [Deployment](DEPLOYMENT.md).
