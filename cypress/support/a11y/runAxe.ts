/// <reference types="../"/>

import { Result } from "axe-core";

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
* A11Y REPORT MODE ONLY
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
* A11Y THROW ON VIOLATION(S)
* ${violations.length} violation${violations.length === 1 ? "" : "s"} ${
        violations.length === 1 ? "was" : "were"
      } detected.
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

export { reportOnViolation, throwOnViolation };
