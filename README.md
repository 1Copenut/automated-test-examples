# Trying out Cypress.io for e2e testing

## The aims of this project
* Evaluate [Cypress](https://cypress.io) for ease of use in end-to-end testing
* See how quickly I can build out helper functions for specific test types
* Apply findings to a simple web server, maybe [Express](https://expressjs.com)

## Getting started
Requires Node 22.6 or newer and Google Chrome for the `chrome` scripts.

```bash
npm ci
npm run cypress:ci    # start the server, run all specs headless in Chrome
npm run cypress:dev   # start the server and open the Cypress app
npm run lint          # type-check the specs, cypress.config.ts and unit tests
npm run test:unit     # unit tests for the reporter's security helpers (no browser)
npm run scan:semgrep  # Semgrep scan with the project's rule exclusions
```

* `npm run cypress:run` uses Cypress's default browser (Electron) instead of Chrome.
* Set `CYPRESS_BASE_URL` to point the tests at a different `http(s)` host.
* Accessibility violations written with `writeToFile` land in `cypress/data/axeViolations.json`.

### Semgrep exclusions
`scan:semgrep` skips `path-join-resolve-traversal`. That rule flags any function parameter that reaches `path.resolve`/`path.join`, so it fires on `resolveInside` in `cypress/support/helpers/security.ts`, which is the path-containment check itself. The only file write (`writeViolationsReport`) uses a fixed path and is covered by unit tests for traversal and symlink attacks.

`--exclude-rule` turns the rule off for the whole repo, not just that file. That is acceptable while `security.ts` is the only code that builds file paths. Revisit the exclusion if other code starts building paths from input.

### WSL2 note
Headless runs need no display server. If Cypress fails with `Missing X server or $DISPLAY`, run `unset DISPLAY` first. Opening the Cypress app (`cypress:dev`) requires WSLg or another X server.

## References
* [Setting up Cypress with axe for accessibility](https://timdeschryver.dev/blog/setting-up-cypress-with-axe-for-accessibility)
* [SO: Typescript Cypress error when getting variable as string](https://stackoverflow.com/a/70265160)
* [Getting Started with Ruby and Capybara](https://roselynemakena.medium.com/getting-started-with-ruby-and-capybara-2d23e799d11e)
