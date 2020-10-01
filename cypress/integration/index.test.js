import { isPercyEnabled } from '../..';

const { match } = Cypress.sinon;

describe('percySnapshot', () => {
  beforeEach(() => {
    cy.task('mock:start').visit('http://localhost:8000/');
    cy.wrap(cy.spy(Cypress, 'log').log(false)).as('log');
  });

  afterEach(() => {
    cy.task('mock:stop');
    delete isPercyEnabled.result;
  });

  it('disables snapshots when the healthcheck fails', () => {
    cy.task('mock:healthcheck:fail');

    cy.percySnapshot();
    cy.percySnapshot('Snapshot 2');

    cy.task('mock:requests').should('deep.equal', [
      ['/percy/healthcheck']
    ]);

    cy.get('@log').should('be.calledWith', match({
      name: 'percySnapshot',
      message: 'Percy is not running, disabling snapshots'
    }));
  });

  it('disables snapshots when the healthcheck encounters an error', () => {
    cy.task('mock:healthcheck:error');

    cy.percySnapshot();
    cy.percySnapshot('Snapshot 2');

    cy.task('mock:requests').should('deep.equal', [
      ['/percy/healthcheck']
    ]);

    cy.get('@log').should('be.calledWith', match({
      name: 'percySnapshot',
      message: 'Percy is not running, disabling snapshots'
    }));
  });

  it('posts snapshots to the local percy server', () => {
    cy.percySnapshot();
    cy.percySnapshot('Snapshot 2');

    cy.task('mock:requests').should(requests => {
      // test stub so we can utilize sinon matchers
      let test = cy.stub(); test(requests);

      expect(test).to.be.calledWith(match([
        match(['/percy/healthcheck']),
        match(['/percy/snapshot', match({
          name: 'percySnapshot posts snapshots to the local percy server',
          url: 'http://localhost:8000/',
          domSnapshot: match(/<!DOCTYPE html><html><head>(.*?)<\/head><body>Snapshot Me<\/body><\/html>/),
          clientInfo: match(/@percy\/cypress\/.+/),
          environmentInfo: match(/cypress\/.+/)
        })]),
        match(['/percy/snapshot', match({
          name: 'Snapshot 2'
        })])
      ]));
    });
  });

  it('handles snapshot errors', () => {
    cy.task('mock:snapshot:error');

    cy.percySnapshot();

    cy.get('@log').should('be.calledWith', match({
      name: 'percySnapshot',
      message: 'Could not take DOM snapshot "percySnapshot handles snapshot errors"'
    }));
  });
});
