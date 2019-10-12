describe('Smoke test', function() {
  it('Asserts tests load', () => {
    expect(true).to.equal(true);
  });
});

describe('First real test', () => {
  it('Visits the Kitchen Sink', () => {
    cy.visit('https://example.cypress.io');

    cy.contains('type').click();

    cy.url().should('include', '/commands/actions');

    cy.get('.action-email')
      .type('fake@email.com')
      .should('have.value', 'fake@email.com');
  });
});


