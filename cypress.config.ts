import { defineConfig } from "cypress";

import { capitalizeFirstLetter } from "./cypress/support/helpers/capitalizeFirstLetter.js";
import {
  MAX_SITEMAP_BYTES,
  MAX_TOTAL_VIOLATIONS,
  extractSameOriginUrls,
  parseViolations,
  readBodyCapped,
  sanitizeForLog,
  validateBaseUrl,
  writeFileInside,
  type SafeViolation,
} from "./cypress/support/helpers/security.js";

const VIOLATIONS_FILE = "cypress/data/axeViolations.json";
const DIVIDER = "========================================";

// Violations saved during the current run. Kept in memory and written in
// full on each save, so the file is never read back and re-trusted.
let collected: SafeViolation[] = [];
let overflowWarned = false;

function resetCollected() {
  collected = [];
  overflowWarned = false;
}

export default defineConfig({
  e2e: {
    // Override with CYPRESS_BASE_URL or --config baseUrl=...; either way
    // the resolved value is validated in setupNodeEvents.
    baseUrl: "http://127.0.0.1:8080",
    setupNodeEvents(on, config) {
      const baseUrl = validateBaseUrl(config.baseUrl);

      // Start each run with an empty report. In `cypress open`, reset per
      // spec instead so re-running a spec does not duplicate results.
      on("before:run", resetCollected);
      if (config.isInteractive) {
        on("before:spec", resetCollected);
      }

      on("task", {
        log(message: unknown) {
          console.log(sanitizeForLog(message));
          return null;
        },
        logA11ySummary(input: unknown) {
          const { url, count } = (input ?? {}) as Record<string, unknown>;
          if (typeof url !== "string" || !Number.isSafeInteger(count)) {
            throw new Error("logA11ySummary: invalid payload");
          }
          const n = count as number;
          console.log(
            [
              "",
              DIVIDER,
              "* A11Y VIOLATIONS REPORTED",
              `* ${sanitizeForLog(url)}`,
              `* ${n} violation${n === 1 ? "" : "s"} ${n === 1 ? "was" : "were"} logged to stdout.`,
              DIVIDER,
            ].join("\n")
          );
          return null;
        },
        /***
         * I have an opinionated preference for how accessibility
         * violations are written to the console. This task reports
         * them in the way that works for me, and is easily customized.
         * Values are untrusted, so each one is sanitized as it is printed.
         */
        logAxeViolationsToConsole(input: unknown) {
          const violations = parseViolations(input);
          if (!violations) {
            throw new Error("logAxeViolationsToConsole: invalid payload");
          }

          violations.forEach((violation, i) => {
            // Add a visual divider between violations
            if (i !== 0) {
              console.log(`\n${DIVIDER}`);
            }

            console.log(`Violation ${i + 1}`);
            console.log(`Url:\t\t${sanitizeForLog(violation.url)}`);
            console.log(`Id:\t\t${sanitizeForLog(violation.id)}`);
            console.log(`Description:\t${sanitizeForLog(violation.description)}`);
            console.log(`Impact:\t\t${sanitizeForLog(violation.impact ?? "none")}`);
            console.log(`Nodes:\t\t${violation.nodes}`);
            violation.tags.forEach((tag, j) => {
              const safeTag = sanitizeForLog(tag);
              console.log(
                j === 0
                  ? `${capitalizeFirstLetter("tags")}:\t\t* ${safeTag}`
                  : `\t\t* ${safeTag}`
              );
            });

            if (i === violations.length - 1) {
              console.log(`\n${DIVIDER}\n`);
            }
          });
          return null;
        },
        saveAxeViolationsToJson(input: unknown) {
          const violations = parseViolations(input);
          if (!violations) {
            throw new Error("saveAxeViolationsToJson: invalid payload");
          }

          const room = MAX_TOTAL_VIOLATIONS - collected.length;
          if (violations.length > room && !overflowWarned) {
            overflowWarned = true;
            console.warn(
              `saveAxeViolationsToJson: report is capped at ${MAX_TOTAL_VIOLATIONS} violations; later results are not saved to ${VIOLATIONS_FILE}.`
            );
          }
          collected.push(...violations.slice(0, Math.max(room, 0)));

          // JSON.stringify escapes control characters, so the stored data
          // keeps its original values. Consumers must escape for their
          // own output (e.g. HTML) when rendering it.
          writeFileInside(
            config.projectRoot,
            VIOLATIONS_FILE,
            JSON.stringify(collected, null, 2)
          );
          return null;
        },
        async sitemapURLs() {
          const res = await fetch(new URL("/sitemap.xml", baseUrl), {
            method: "GET",
            headers: { Accept: "application/xml, text/xml" },
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) {
            throw new Error(`sitemap.xml request failed: ${res.status}`);
          }

          const xml = await readBodyCapped(res, MAX_SITEMAP_BYTES);

          // Only same-origin http(s) URLs are returned, so a tampered
          // sitemap cannot point the browser at other hosts.
          return extractSameOriginUrls(xml, baseUrl);
        },
        table(messageArr: unknown) {
          if (!Array.isArray(messageArr)) {
            throw new Error("table: expected an array");
          }
          // Strip control characters from every string value.
          console.table(
            JSON.parse(
              JSON.stringify(messageArr.slice(0, 1000), (_k, v) =>
                typeof v === "string" ? sanitizeForLog(v) : v
              )
            )
          );
          return null;
        },
      });

      return config;
    },
  },
  // Lets before:run / before:spec fire in `cypress open` as well.
  experimentalInteractiveRunEvents: true,
  video: false,
});
