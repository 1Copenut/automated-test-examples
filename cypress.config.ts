import { Result } from "axe-core";
import { defineConfig } from "cypress";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFile } from "fs";

import { capitalizeFirstLetter } from "./cypress/support/helpers/capitalizeFirstLetter.js";

export default defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:8080", // TODO: Add Dotenv here
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
              console.log("\n========================================");
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

            // Add a visual divider after all violations
            if (i === violations.length - 1) {
              console.log("\n========================================\n");
            }
          });
          return null;
        },
        saveToJSON(dataArr: []) {
          const path = "./cypress/data/accessibility.json";
          const pathExists = existsSync(path);

          let data;

          console.log("Removing data directory");
          rmSync("./cypress/data/", { recursive: true, force: true });

          if (!pathExists) {
            console.log("Writing first data object");
            data = dataArr;
            const firstData = JSON.stringify(data, null, 2);

            writeFile(path, firstData, { flag: "w" }, (err: any) => {
              if (err) {
                console.log("An error has occurred ", err);
                return null;
              }
            });
            console.log("Data written successfully to disk");
          }

          if (pathExists) {
            console.log("Creating empty data directory");
            mkdirSync("./cypress/data/");

            console.log("Writing next data object");
            data = JSON.parse(readFileSync(path, "utf8"));

            let nextData = data.concat(dataArr);
            nextData = JSON.stringify(nextData, null, 2);

            console.log(nextData);

            writeFile(path, nextData, (err) => {
              if (err) {
                console.log(`An error occurred: ${err}`);
                return null;
              }
            });
            console.log("Data written successfully to disk");
          }
          return null;
        },
        async sitemapURLs() {
          return await fetch(`${config.baseUrl}/sitemap.xml`, {
            method: "GET",
            headers: {
              "Content-Type": "application/xml",
            },
          })
            .then((res) => res.text())
            .then((xml) => {
              const regex = /\<loc\>(.|\n)*?<\/loc\>/g;
              const locs = [...xml.matchAll(regex)];
              const urls = locs.map(([loc]) =>
                loc.replace("<loc>", "").replace("</loc>", "")
              );
              return urls;
            });
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
