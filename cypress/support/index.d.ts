/// <reference types="cypress" />

import { ContextObject, Result, RunOptions } from "axe-core";
import { realPress } from "cypress-real-events/commands/realPress";

type KeyOrShortcut = Parameters<typeof realPress>[0];
type RealPressOptions = Parameters<typeof realPress>[1];

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

      /**
       * Repeat common single keypresses and chords (two or three keys pressed together)
       *
       * @param keyToPress Pass a string to press single keys or Array<string> to press chords like Shift + Tab
       * @param count Number of times to press a key. Defaults to 2.
       * @param options Set pointer to "mouse" | "pen"
       * @see https://github.com/dmtrKovalenko/cypress-real-events#cyrealpress
       */
      repeatRealPress(
        keyToPress: KeyOrShortcut,
        count?: number,
        options?: RealPressOptions
      ): void;
    }
  }
}
