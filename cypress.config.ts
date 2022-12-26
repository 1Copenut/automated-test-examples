import { Result } from "axe-core";
import { defineConfig } from "cypress";
import { capitalizeFirstLetter } from "./cypress/support/helpers/capitalizeFirstLetter.js";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      on("task", {
        log(message: string) {
          console.log(message);
          return null;
        },
        /***
         * I have an opinionated preference for how accessibility
         * violations are written to the console. This task reports
         * them in the way that works for me, and is easily customized.
         */
        logA11y(violations: Result[]) {
          violations.forEach((violation: Result, i: number) => {
            // Add a visual divider between violations
            if (i !== 0) {
              console.log("========================================");
            }

            // Declare the total violations logged
            console.log(`Violation ${i + 1}`);
            for (let key in violation) {
              const val = violation[key as keyof Result];

              // Description refuses to line up vertically
              if (typeof val === "string" && key === "description") {
                console.log(
                  `${capitalizeFirstLetter(key)}:\t${violation[key]}`
                );
              }

              // Align keys and values vertically
              if (typeof val === "string" && key !== "description") {
                console.log(`${capitalizeFirstLetter(key)}:\t\t${val}`);
              }

              // Node length is useful for triaging level of effort
              if (typeof val === "number") {
                console.log(`${capitalizeFirstLetter(key)}:\t\t${val}`);
              }

              // Tags are helpful for writing issues and reports
              if (typeof val === "object") {
                // Assume tags is an array and will never be null.
                // All violations have at least one tag.
                const tags = val;

                tags!.forEach((tag: any, i: number) => {
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
        table(messageArr: Array<any>) {
          console.table(messageArr);
          return null;
        },
      });

      return config;
    },
  },
  video: false,
});
