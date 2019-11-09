describe('Smoke test', function() {
  it('Asserts tests load', () => {
    expect(true).to.equal(true);
  });
});

describe('First real test', () => {
  it('Visits the Movie Cards index page', () => {
    cy.visit('http://localhost:8000');
    cy.title().should('eq', 'Cypress Test Suite');
    cy.get('article.cy-article').should('have.length', 3);
    cy.get('article[aria-labelledby="header-1"]').contains('h2', 'Shaun of the Dead');
    cy.get('article[aria-labelledby="header-2"]').contains('h2', 'The Dark Knight');
    cy.get('article[aria-labelledby="header-3"]').contains('h2', 'Watchmen');
  });
});


