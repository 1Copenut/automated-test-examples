import { defineConfig } from "cypress";
import { Result } from "axe-core";
import capitalizeFirstLetter from "./cypress/support/helpers/capitalizeFirstLetter.js";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      on("task", {
        log(message) {
          console.log(message);
          return null;
        },
        logA11y(violations) {
          violations.forEach((violation: any, i: number) => {
            // Add a visual divider between violations
            if (i !== 0) {
              console.log("========================================");
            }

            // Violation number N
            console.log(`Violation ${i + 1}`);
            for (let key in violation) {
              if (typeof violation[key] === "string" && key === "description") {
                console.log(
                  `${capitalizeFirstLetter(key)}:\t${violation[key]}`
                );
              }

              // Description refuses to line up vertically
              if (typeof violation[key] === "string" && key !== "description") {
                console.log(
                  `${capitalizeFirstLetter(key)}:\t\t${violation[key]}`
                );
              }

              // Node length
              if (typeof violation[key] === "number") {
                console.log(
                  `${capitalizeFirstLetter(key)}:\t\t${violation[key]}`
                );
              }

              // Tags are helpful for writing issues and reports
              if (typeof violation[key] === "object") {
                // Assume this is the "tags" array
                const tags = violation[key];
                tags.forEach((tag: any, i: number) => {
                  if (i === 0) {
                    console.log(`${capitalizeFirstLetter(key)}:\t\t* ${tag}`);
                  } else {
                    console.log(`\t\t* ${tag}`);
                  }
                });
              }
            }
          });
          // TODO: Add the Cypress write to JSON file
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        },
      });

      return config;
    },
  },
});
