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

// Check if Percy is enabled while injecting the @percy/dom script
export function isPercyEnabled() {
  if (isPercyEnabled.result != null) {
    return Promise.resolve(isPercyEnabled.result);
  } else {
    return Cypress.backend('http:request', {
      url: `${PERCY_CLI_API}/dom.js`,
      retryOnNetworkFailure: false
    }).then(r => {
      if (!r.isOkStatusCode) {
        throw new Error(r.body.error || `${r.status} ${r.statusText}`);
      } else {
        isPercyEnabled.version = r.headers['x-percy-core-version'] || '0';
        isPercyEnabled.result = true;
        eval(r.body); // eslint-disable-line no-eval
      }
    }).catch(error => {
      isPercyEnabled.result = false;
      return error;
    }).then(error => {
      let { version } = isPercyEnabled;

      if (version && parseInt(version, 10) !== 1) {
        log('Unsupported Percy CLI version, disabling snapshots', { version });
        isPercyEnabled.result = false;
      } else if (!isPercyEnabled.result) {
        log('Percy is not running, disabling snapshots', { error });
      }

      return isPercyEnabled.result;
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
        // Should have been injected by now
        let { PercyDOM: { serialize } } = window;

        // Post the DOM to the snapshot endpoint with snapshot options and other info
        return Cypress.backend('http:request', {
          url: `${PERCY_CLI_API}/snapshot`,
          method: 'POST',
          body: JSON.stringify({
            ...options,
            environmentInfo: ENV_INFO,
            clientInfo: CLIENT_INFO,
            domSnapshot: serialize({ ...options, dom }),
            url: dom.URL,
            name
          })
        // Handle errors
        }).then(r => {
          if (!r.isOkStatusCode) {
            throw new Error(r.body.error || `${r.status} ${r.statusText}`);
          } else {
            log(name, { name, ...options });
          }
        }).catch(error => {
          log(`Could not take DOM snapshot "${name}"`, { name, error });
        });
      });
    }
  });
});
