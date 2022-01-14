// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

// https://medium.com/factset/the-automated-ui-testing-methodology-you-need-to-try-9ce4d8afe623#e086
Cypress.Commands.add("axTree", () => {
  return Cypress.automation("remote:debugger:protocol", {
    command: "Accessibility.enable",
  }).then(() => {
    return Cypress.automation("remote:debugger:protocol", {
      command: "Accessibility.getFullAXTree",
    });
  });
});