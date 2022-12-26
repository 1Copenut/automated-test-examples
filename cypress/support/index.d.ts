/// <reference types="cypress" />

import { ContextObject, Result, RunOptions } from "axe-core";

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      /**
       * Convenience method to run the axe-core accessibility scanner without having to establish
       * `cy.injectAxe()` in a `beforeEach` block. This method also reports axe violations in the
       * console output for debugging.
       *
       * @param reportOnly Set to true to report violations to the console without an exit 1 test failure.
       * @param axeContext Pass a string or object with include / exclude keys to set the target(s) to be evaluated.
       * @param axeConfig Add or change rules in the axe.run config object
       * @param callback Provide a custom callback function to handle the violations array from the Results object
       * @see https://www.deque.com/axe/core-documentation/api-documentation/#api-name-axerun
       * @see https://www.deque.com/axe/core-documentation/api-documentation/#results-object
       */
      runAxe(options?: {
        reportOnly?: boolean;
        axeContext?: ContextObject | string;
        axeConfig?: RunOptions;
        callback?: (violations: Result[]) => void;
      }): void;
    }
  }
}
