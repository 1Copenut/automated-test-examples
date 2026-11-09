# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A sandbox for exploring end-to-end, keyboard, and accessibility (axe-core) testing with Cypress against a small static site. A separate `selenium/` directory holds unrelated Ruby suites (minitest, rspec, webdriver) with their own Gemfiles; they are not part of the Cypress workflow.

## Commands

```bash
npm run start            # serve public/sitewide-a11y on http://127.0.0.1:8080 (http-server)
npm run cypress:ci       # start server, wait for :8080, run all specs headless in Chrome, stop server
npm run cypress:dev      # start server and open the interactive Cypress app
npm run cypress:run:chrome   # run specs in Chrome (server must already be running)
npm run lint             # tsc --noEmit type-check of the specs
```

Run a single spec (server must be running, or wrap with `start-server-and-test start 8080 '...'`):

```bash
npx cypress run --browser chrome --spec cypress/e2e/sitewide-a11y/indexCards.cy.ts
```

Environment notes (WSL2): headless runs fail with `Missing X server or $DISPLAY` if a stale `DISPLAY` is set, so `unset DISPLAY` first. `cypress open` needs a working X server (WSLg). The `chrome` scripts require Google Chrome (the `.deb`, not the snap Chromium).

## Architecture

The system under test is static HTML in `public/sitewide-a11y/` (an index of movie cards plus `anycorp/*.html` pages and a `sitemap.xml`), served by `http-server`. `baseUrl` is hardcoded to `http://127.0.0.1:8080` in `cypress.config.ts`.

Several files must be read together to understand the a11y flow:

- **`cypress/support/a11y/runAxe.ts`** defines the `cy.runAxe()` custom command. It injects axe, then calls `cy.checkA11y` with a default context/config (`defaultAxeConfig.ts`: WCAG 2.x A/AA + section508, color-contrast disabled) and a callback that reports violations.
- **The callback does not print directly.** It calls `cy.task(...)`, and those tasks run in Node, defined in `setupNodeEvents` in **`cypress.config.ts`**: `log`, `logAxeViolationsToConsole`, `saveAxeViolationsToJson`, `sitemapURLs`, `table`. `writeToFile: true` appends violations to `cypress/data/axeViolations.json` (gitignored); a module-level `firstRun` flag resets the file on the first write of a run.
- **`cypress/support/e2e.ts` / `commands.ts`** register the custom commands (`runAxe`, `repeatRealPress`) and import `cypress-axe` and `cypress-real-events`. Their TypeScript signatures live in **`cypress/support/index.d.ts`**, so a new command needs both a `Cypress.Commands.add` and a `Chainable` declaration. Specs pull the types in with `/// <reference types="../../support" />`.
- **`a11ySitemap.cy.ts`** gets page URLs from the `sitemapURLs` task (which fetches `/sitemap.xml` from the Node side) and runs `cy.runAxe` on each. **`indexCards.cy.ts`** covers functional assertions plus keyboard focus order via `cy.realPress` / `cy.repeatRealPress`.

The project is ESM (`"type": "module"`), so imports in `cypress.config.ts` use `.js` extensions even for `.ts` sources. Tests currently use `reportOnly: true`, so axe violations are logged rather than failing the run.

## Docker

`Dockerfile` and `scripts/docker-cypress.sh` exist but are unfinished (the script still has a placeholder image URL). Docker setup is deliberately deferred; do not modify these without being asked.

## Branches

`main` is the base. A `feature/cypress-modernization` branch (Cypress 16, TypeScript 5.9, hardened `cypress.config.ts` with `cypress/support/helpers/security.ts`, stricter tsconfig) may not be merged yet, so check the current branch's `package.json` before assuming versions or file layout. Stay on TypeScript 5.x: TypeScript 7 removed the JS compiler API that Cypress's bundled `ts-loader` depends on.
