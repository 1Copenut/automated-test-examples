// Libs
import "cypress-axe";
import "cypress-real-events";

// Custom commands
import { defaultContext, defaultAxeConfig } from "./a11y/defaultAxeConfig";
import { reportOnViolation, throwOnViolation } from "./a11y/runAxe";

Cypress.Commands.add(
  "runAxe",
  ({ reportOnly, axeContext, axeConfig, callback } = {}) => {
    cy.injectAxe();
    cy.checkA11y(
      axeContext ?? defaultContext,
      axeConfig ?? defaultAxeConfig,
      callback ?? reportOnly ? reportOnViolation : throwOnViolation,
      reportOnly
    );
  }
);
