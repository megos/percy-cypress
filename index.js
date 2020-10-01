import serializeDOM from '@percy/dom';

// Collect client and environment information
const sdkPkg = require('./package.json');
const CLIENT_INFO = `${sdkPkg.name}/${sdkPkg.version}`;
const ENV_INFO = `cypress/${Cypress.version}`;

// Maybe get the CLI API address from the environment
const PERCY_CLI_API = Cypress.env('PERCY_CLI_API') || 'http://localhost:5338/percy';

// Common log function
function log(message, meta) {
  return Cypress.log({
    name: 'percySnapshot',
    displayName: 'percy',
    consoleProps: () => meta,
    message
  });
}

// Check if Percy is enabled using the healthcheck endpoint
export function isPercyEnabled() {
  if (isPercyEnabled.result != null) {
    return Promise.resolve(isPercyEnabled.result);
  } else {
    return Cypress.backend('http:request', {
      url: `${PERCY_CLI_API}/healthcheck`,
      retryOnNetworkFailure: false
    }).then(({ body: { success, error } }) => {
      if (!success) throw new Error(error);
      return (isPercyEnabled.result = true);
    }).catch(error => {
      log('Percy is not running, disabling snapshots', { error });
      return (isPercyEnabled.result = false);
    });
  }
}

// Take a DOM snapshot and post it to the snapshot endpoint
Cypress.Commands.add('percySnapshot', (name, options) => {
  // Avoid mixing promises and commands
  cy.then(isPercyEnabled).then(enabled => {
    // Default name to test title
    name = name || cy.state('runnable').fullTitle();

    if (!enabled) {
      log(`**SKIPPED** ${name}`, { name });
    } else {
      // Serialize and capture the DOM
      cy.document({ log: false }).then(dom => {
        // Post the DOM to the snapshot endpoint with snapshot options and other info
        return Cypress.backend('http:request', {
          url: `${PERCY_CLI_API}/snapshot`,
          method: 'POST',
          body: JSON.stringify({
            ...options,
            environmentInfo: ENV_INFO,
            clientInfo: CLIENT_INFO,
            domSnapshot: serializeDOM({ ...options, dom }),
            url: dom.URL,
            name
          })
        // Handle errors
        }).then(({ body: { success, error } }) => {
          if (!success) throw new Error(error);
          log(name, { name, ...options });
        }).catch(error => {
          log(`Could not take DOM snapshot "${name}"`, { name, error });
        });
      });
    }
  });
});
