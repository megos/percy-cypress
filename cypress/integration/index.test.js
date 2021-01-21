import { isPercyEnabled } from '../..';
const { match } = Cypress.sinon;

describe('percySnapshot', () => {
  beforeEach(() => {
    delete isPercyEnabled.result;
    cy.task('sdk:setup').visit('http://localhost:8000/');
    cy.wrap(cy.spy(Cypress, 'log').log(false)).as('log');
  });

  afterEach(() => {
    cy.task('sdk:teardown');
  });

  it('disables snapshots when the API fails', () => {
    cy.task('sdk:test:failure', '/percy/dom.js');

    cy.percySnapshot();
    cy.percySnapshot('Snapshot 2');

    cy.task('sdk:server:requests').should('deep.equal', [
      ['/percy/dom.js']
    ]);

    cy.get('@log').should('be.calledWith', match({
      name: 'percySnapshot',
      message: 'Percy is not running, disabling snapshots'
    }));
  });

  it('disables snapshots when the API encounters an error', () => {
    cy.task('sdk:test:error', '/percy/dom.js');

    cy.percySnapshot();
    cy.percySnapshot('Snapshot 2');

    cy.task('sdk:server:requests').should('deep.equal', [
      ['/percy/dom.js']
    ]);

    cy.get('@log').should('be.calledWith', match({
      name: 'percySnapshot',
      message: 'Percy is not running, disabling snapshots'
    }));
  });

  it('posts snapshots to the local percy server', () => {
    cy.percySnapshot();
    cy.percySnapshot('Snapshot 2');

    cy.task('sdk:server:requests').should(requests => {
      // test stub so we can utilize sinon matchers
      let test = cy.stub(); test(requests);

      expect(test).to.be.calledWith(match([
        match(['/percy/dom.js']),
        match(['/percy/snapshot', match({
          name: 'percySnapshot posts snapshots to the local percy server',
          url: 'http://localhost:8000/',
          domSnapshot: match(/<html><head>(.*?)<\/head><body>Snapshot Me<\/body><\/html>/),
          clientInfo: match(/@percy\/cypress\/.+/),
          environmentInfo: match(/cypress\/.+/)
        })]),
        match(['/percy/snapshot', match({
          name: 'Snapshot 2'
        })])
      ]));
    });
  });

  it('handles snapshot failures', () => {
    cy.task('sdk:test:failure', '/percy/snapshot');

    cy.percySnapshot();

    cy.get('@log').should('be.calledWith', match({
      name: 'percySnapshot',
      message: 'Could not take DOM snapshot "percySnapshot handles snapshot failures"'
    }));
  });
});
