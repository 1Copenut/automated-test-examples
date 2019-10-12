describe('Smoke test', function() {
  it('Asserts tests load', function() {
    expect(true).to.equal(true);
  });
});

describe('First real test', function() {
  it('Visits the Kitchen Sink', function() {
    cy.visit('https://example.cypress.io');
  });
});
