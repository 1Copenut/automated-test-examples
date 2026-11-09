import { defineConfig } from "cypress";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";

import { capitalizeFirstLetter } from "./cypress/support/helpers/capitalizeFirstLetter.js";
import {
  MAX_SITEMAP_BYTES,
  extractSameOriginUrls,
  parseViolations,
  resolveInside,
  sanitizeForLog,
  type SafeViolation,
} from "./cypress/support/helpers/security.js";

const MAX_JSON_BYTES = 10_000_000;

// Override with CYPRESS_BASE_URL. Only http(s) is accepted.
const baseUrl = process.env.CYPRESS_BASE_URL ?? "http://127.0.0.1:8080";
if (!/^https?:$/.test(new URL(baseUrl).protocol)) {
  throw new Error("CYPRESS_BASE_URL must use http or https");
}

// The first save in a run resets the output file; later saves append.
let firstRun = true;

export default defineConfig({
  e2e: {
    baseUrl,
    setupNodeEvents(on, config) {
      on("task", {
        log(message: unknown) {
          console.log(sanitizeForLog(message));
          return null;
        },
        /***
         * I have an opinionated preference for how accessibility
         * violations are written to the console. This task reports
         * them in the way that works for me, and is easily customized.
         * All values come from the page under test, so they are
         * validated and sanitized before printing.
         */
        logAxeViolationsToConsole(input: unknown) {
          const violations = parseViolations(input);
          if (!violations) {
            throw new Error("logAxeViolationsToConsole: invalid payload");
          }

          violations.forEach((violation: SafeViolation, i: number) => {
            // Add a visual divider between violations
            if (i !== 0) {
              console.log("\n========================================");
            }

            console.log(`Violation ${i + 1}`);
            console.log(`Url:\t\t${violation.url}`);
            console.log(`Id:\t\t${violation.id}`);
            console.log(`Description:\t${violation.description}`);
            console.log(`Impact:\t\t${violation.impact ?? "none"}`);
            console.log(`Nodes:\t\t${violation.nodes}`);
            violation.tags.forEach((tag, j) => {
              console.log(
                j === 0
                  ? `${capitalizeFirstLetter("tags")}:\t\t* ${tag}`
                  : `\t\t* ${tag}`
              );
            });

            if (i === violations.length - 1) {
              console.log("\n========================================\n");
            }
          });
          return null;
        },
        saveAxeViolationsToJson(input: unknown) {
          const violations = parseViolations(input);
          if (!violations) {
            throw new Error("saveAxeViolationsToJson: invalid payload");
          }

          const dir = resolveInside(config.projectRoot, "cypress", "data");
          const path = resolveInside(dir, "axeViolations.json");
          mkdirSync(dir, { recursive: true, mode: 0o700 });

          let existing: SafeViolation[] = [];
          if (
            !firstRun &&
            existsSync(path) &&
            statSync(path).size <= MAX_JSON_BYTES
          ) {
            try {
              const parsed = parseViolations(
                JSON.parse(readFileSync(path, "utf8"))
              );
              existing = parsed ?? [];
            } catch {
              existing = []; // Corrupt file: start over rather than crash.
            }
          }
          firstRun = false;

          const out = JSON.stringify([...existing, ...violations], null, 2);
          if (out.length > MAX_JSON_BYTES) {
            throw new Error("saveAxeViolationsToJson: output too large");
          }
          writeFileSync(path, out, { mode: 0o600 });
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

          const xml = await res.text();
          if (xml.length > MAX_SITEMAP_BYTES) {
            throw new Error("sitemap.xml is too large");
          }

          // Only same-origin http(s) URLs are returned, so a tampered
          // sitemap cannot point the browser at other hosts.
          return extractSameOriginUrls(xml, baseUrl);
        },
        table(messageArr: unknown) {
          if (!Array.isArray(messageArr)) {
            throw new Error("table: expected an array");
          }
          console.table(
            JSON.parse(sanitizeJson(JSON.stringify(messageArr.slice(0, 1000))))
          );
          return null;
        },
      });

      return config;
    },
  },
  video: false,
});

// Strip control characters from every string value in serialized JSON.
function sanitizeJson(json: string): string {
  return JSON.stringify(JSON.parse(json), (_k, v) =>
    typeof v === "string" ? sanitizeForLog(v) : v
  );
}
