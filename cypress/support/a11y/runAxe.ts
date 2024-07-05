/// <reference types="../"/>

import { Result } from "axe-core";

import { defaultContext, defaultAxeConfig } from "./defaultAxeConfig";

let currentURL: string;

const printAxeViolationsToConsole = (violations: Result[]) => {
  // Destructure data points from violation objects to create readable output
  const violationData = violations.map(
    ({ id, description, impact, nodes, tags }) => ({
      id,
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
* ${currentURL}
* ${violations.length} violation${violations.length === 1 ? "" : "s"} ${
      violations.length === 1 ? "was" : "were"
    } logged to stdout.
========================================`
  );

  // Print the violations to custom logging function
  cy.task("logA11y", violationData);

  // Save the violations to JSON file
  // cy.task("saveToJSON", violationData);
};

const runAxe = (
  { reportOnly, axeContext, axeConfig, callback } = {
    reportOnly: undefined,
    axeContext: undefined,
    axeConfig: undefined,
    callback: undefined,
  }
) => {
  cy.url().then((url) => {
    currentURL = url;
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
