/// <reference types="../"/>

import { ContextObject, Result, RunOptions } from "axe-core";

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
      id,
      description,
      impact,
      nodes: nodes.length,
      tags,
    })
  );

  // Print a message highlighting number of violations on the page
  // https://github.com/component-driven/cypress-axe#reportOnly-optional-defaults-to-false
  // The banner is built in Node so no multi-line text crosses the task
  // boundary; the `log` task flattens newlines to prevent log forging.
  cy.task("logA11ySummary", {
    url: runAxeConfig.currentURL,
    count: violations.length,
  });

  cy.task("logAxeViolationsToConsole", violationData);

  if (runAxeConfig.writeViolationsToFile) {
    cy.task("saveAxeViolationsToJson", violationData);
  }
};

type RunAxeOptions = {
  reportOnly?: boolean;
  writeToFile?: boolean;
  axeContext?: ContextObject | string;
  axeConfig?: RunOptions;
  callback?: (violations: Result[]) => void;
};

const runAxe = ({
  reportOnly = false,
  writeToFile = false,
  axeContext,
  axeConfig,
  callback,
}: RunAxeOptions = {}) => {
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
