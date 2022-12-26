/// <reference types="../"/>

import { Result } from "axe-core";

import { defaultContext, defaultAxeConfig } from "./defaultAxeConfig";

const printViolations = (violations: Result[], skipTestFailure?: boolean) => {
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

  // Print a custom message to the console in report mode
  // https://github.com/component-driven/cypress-axe#reportOnly-optional-defaults-to-false
  if (skipTestFailure) {
    cy.task(
      "log",
      `
========================================
* A11Y REPORT-ONLY MODE
* ${violations.length} violation${violations.length === 1 ? "" : "s"} ${
        violations.length === 1 ? "was" : "were"
      } logged to stdout.
========================================\n`
    );
  }

  // Print violations to the console and throw in test
  // https://github.com/component-driven/cypress-axe#using-the-violationcallback-argument
  if (!skipTestFailure) {
    cy.task(
      "log",
      `
========================================
* A11Y VIOLATION(S)
* ${violations.length} violation${violations.length === 1 ? "" : "s"} ${
        violations.length === 1 ? "was" : "were"
      } thrown.
========================================\n`
    );
  }

  // Print the violations to custom logging function
  cy.task("logA11y", violationData);
};

const reportOnViolation = (violations: Result[]) => {
  printViolations(violations, true);
};

const throwOnViolation = (violations: Result[]) => {
  printViolations(violations);
};

const runAxe = (
  { reportOnly, axeContext, axeConfig, callback } = {
    reportOnly: undefined,
    axeContext: undefined,
    axeConfig: undefined,
    callback: undefined,
  }
) => {
  cy.injectAxe();
  cy.checkA11y(
    axeContext ?? defaultContext,
    axeConfig ?? defaultAxeConfig,
    callback ?? reportOnly ? reportOnViolation : throwOnViolation,
    reportOnly
  );
};

export { runAxe, reportOnViolation, throwOnViolation };
