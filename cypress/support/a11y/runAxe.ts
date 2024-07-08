/// <reference types="../"/>

import { Result } from "axe-core";

import { defaultContext, defaultAxeConfig } from "./defaultAxeConfig";

type RunAxeConfigType = {
  currentURL: string;
  writeViolationsToFile: boolean;
};

let runAxeConfig: RunAxeConfigType = {
  currentURL: "",
  writeViolationsToFile: false,
};

const printAxeViolationsToConsole = (violations: Result[]) => {
  // TODO: Add a unique timestamp to each file for visualization upload.
  const violationData = violations.map(
    ({ id, description, impact, nodes, tags }) => ({
      url: runAxeConfig.currentURL,
      violationId: id,
      description,
      impact,
      nodes: nodes.length,
      tags,
    })
  );

  // Print a message highlighting number of violations on the page
  // https://github.com/component-driven/cypress-axe#reportOnly-optional-defaults-to-false
  cy.task(
    "log",
    `
========================================
* A11Y VIOLATIONS REPORTED
* ${runAxeConfig.currentURL}
* ${violations.length} violation${violations.length === 1 ? "" : "s"} ${
      violations.length === 1 ? "was" : "were"
    } logged to stdout.
========================================`
  );

  cy.task("logAxeViolationsToConsole", violationData);

  if (runAxeConfig.writeViolationsToFile) {
    cy.task("saveAxeViolationsToJson", violationData);
  }
};

const runAxe = (
  {
    reportOnly = false,
    writeToFile = false,
    axeContext,
    axeConfig,
    callback,
  } = {
    axeContext: undefined,
    axeConfig: undefined,
    callback: undefined,
  }
) => {
  cy.url().then((url) => {
    runAxeConfig.currentURL = url;
    runAxeConfig.writeViolationsToFile = writeToFile;
  });
  cy.injectAxe();
  cy.checkA11y(
    axeContext ?? defaultContext,
    axeConfig ?? defaultAxeConfig,
    callback ?? printAxeViolationsToConsole,
    reportOnly
  );
};

export { runAxe };
