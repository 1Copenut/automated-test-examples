/// <reference types="../"/>

import { realPress } from "cypress-real-events/commands/realPress";

type KeyOrShortcut = Parameters<typeof realPress>[0];
type RealPressOptions = Parameters<typeof realPress>[1];

const repeatRealPress = (
  keyToPress: KeyOrShortcut,
  count = 2,
  options: RealPressOptions
) => {
  for (let i = 0; i < count; i++) {
    cy.realPress(keyToPress, options);
  }
};

export { repeatRealPress };
