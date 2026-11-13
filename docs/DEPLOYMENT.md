# Deploy to Vercel

This project is a static Vite application. It requires no server-side API key, database, or account integration. The optional local CLI tools remain local and are not deployed as server functions.

## Reproduce a build

Install Node.js 24 and npm, clone the verified GitHub `main`, then run:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`package-lock.json` pins dependencies; `engines.node` pins the supported Node major to `24.x`. Keep all existing `prebuild` steps: document/OCR applications use them to prepare same-origin worker, font, language, or WASM assets. The final static output is `dist/`.

## Vercel project settings

Import this repository from GitHub with production branch **main** and root directory **.**. The tracked `vercel.json` selects:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | `24.x` through package engines |

Use Vercel's existing account/team and review the resulting production domain. No actual deployment domain is guessed or hard-coded in source. No SPA catch-all rewrite is needed because the application operates at `/`; missing worker/model files should produce a real 404, not an HTML fallback.

## Production metadata and previews

The authorized `postbuild` hook runs `npm run prepare:hosting` automatically after Vite. The helper reads system environment variables at Node build time, so no browser-side `VITE_` prefix or secret is necessary. Vercel must expose its system environment variables.

- A production build requires `VERCEL_ENV=production` and a valid `VERCEL_PROJECT_PRODUCTION_URL` hostname. It writes a canonical URL and `og:url` to the built HTML, a same-origin `robots.txt`, and a one-URL root sitemap.
- The sitemap contains only the canonical production home page. It deliberately omits `<lastmod>` because build time is not evidence of a content modification date.
- Local and preview builds receive `noindex,nofollow`, a generated robots exclusion, and no production sitemap or canonical. The production-domain variable is present in Vercel previews too; the script therefore also checks `VERCEL_ENV`.
- Explicit source robots meta directives and custom robots files are preserved. Custom policies suppress automatic sitemap generation and require a deliberate indexing review. Existing custom canonical/sitemap declarations cause a clear build error rather than silent replacement.
- The script writes only `dist/`; it never modifies source HTML, reads credentials, or inserts a Google verification token.

The hosting regression tests use reserved example domains and temporary directories. Run `npm test` to verify production, preview, invalid hostname, escaping, and custom-policy behavior.

## Verify the live result

After deployment, record the Vercel production URL and the exact deployed GitHub `main` commit. Verify the home page, canonical, `/robots.txt`, `/sitemap.xml`, and the application's real example/import/export workflow. For document/OCR tools, also exercise the actual local worker and model assets on the production origin. Do not submit preview or protected URLs to search engines.

Search Console setup, ownership verification, sitemap submission, and URL Inspection require the authorized Google account and verification method. A source change or sitemap upload does not guarantee indexing. Do not change DNS, owner access, or verification tags without the required scope authorization.

## Rollback

If a deployment fails validation, retain its diagnostics and use Vercel's existing deployment history to restore the previously verified production deployment when authorized. Source fixes belong on Windows, must pass checks, and must be integrated into GitHub `main` before a new production build. Do not repair an ephemeral build output manually or force-push the repository.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).
