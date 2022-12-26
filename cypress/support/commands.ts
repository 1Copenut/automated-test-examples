// Libs
import "cypress-axe";
import "cypress-real-events";

// Custom commands
import { defaultContext, defaultAxeConfig } from "./a11y/defaultAxeConfig";
import { runAxe } from "./a11y/runAxe";
import { repeatRealPress } from "./keyboard/repeatRealPress";

Cypress.Commands.add("runAxe", runAxe);
Cypress.Commands.add("repeatRealPress", repeatRealPress);
