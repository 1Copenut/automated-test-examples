/// <reference types="cypress-real-events" />
/// <reference types="../support" />

describe("Smoke test", function () {
  it("Asserts tests load", () => {
    expect(true).to.equal(true);
  });
});

describe("First real test", () => {
  it("Visits the Movie Cards index page", () => {
    cy.visit("/");
    cy.title().should("eq", "Cypress Test Suite");
    cy.get("article.cy-article").should("have.length", 4);
    cy.get('article[aria-labelledby="header-1"]').contains(
      "h2",
      "Shaun of the Dead"
    );
    cy.get('article[aria-labelledby="header-2"]').contains(
      "h2",
      "The Dark Knight"
    );
    cy.get('a[data-test-subj="cy-skip-link"]').focus();
    cy.realPress("Tab");
    cy.get("a#card-1-id").should("have.focus");
    cy.repeatRealPress("Tab", 3);
    cy.get("a#card-4-id").should("have.focus");
    cy.repeatRealPress(["Shift", "Tab"], 3);
    cy.get("a#card-1-id").should("have.focus");
    cy.runAxe({ reportOnly: true });
  });
});
