require('cypress-plugin-tab');

describe('Smoke test', function() {
  it('Asserts tests load', () => {
    expect(true).to.equal(true);
  });
});

describe('First real test', () => {
  it('Visits the Movie Cards index page', () => {
    cy.visit('http://localhost:8080');
    cy.title().should('eq', 'Cypress Test Suite');
    cy.get('article.cy-article').should('have.length', 3);
    cy.get('article[aria-labelledby="header-1"]').contains('h2', 'Shaun of the Dead');
    cy.get('article[aria-labelledby="header-2"]').contains('h2', 'The Dark Knight');
    cy.get('article[aria-labelledby="header-3"]').contains('h2', 'Watchmen');
    cy.get('body').tab();
    cy.focused().should('have.id', 'card-1-id');
    cy.focused().tab();
    cy.focused().should('have.id', 'card-2-id');
    cy.focused().tab();
    cy.focused().should('have.id', 'card-3-id');
  });
});


