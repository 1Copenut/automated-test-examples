import { RunOptions } from "axe-core";

const defaultContext: string = 'body[data-cypress-id="cypress-test--index"]';

// https://www.deque.com/axe/core-documentation/api-documentation/
const defaultAxeConfig: RunOptions = {
  runOnly: {
    type: "tag",
    values: ["section508", "wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
  rules: {
    "color-contrast": {
      enabled: false,
    },
  },
};

export { defaultContext, defaultAxeConfig };
