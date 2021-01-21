const sdk = require('@percy/sdk-utils/test/helper');

module.exports = on => {
  // start a mock testing site
  sdk.testsite.mock().then(() => {
    process.on('exit', sdk.testsite.close);
  });

  // register sdk tasks
  on('task', {
    'sdk:setup': async () => {
      if (!sdk.server) await sdk.setup();
      return null;
    },

    'sdk:teardown': async () => {
      await sdk.teardown();
      delete sdk.server;
      return null;
    },

    'sdk:server:requests': () => {
      return sdk.server.requests;
    },

    'sdk:test:failure': (...a) => {
      sdk.test.failure(...a);
      return null;
    },

    'sdk:test:error': (...a) => {
      sdk.test.error(...a);
      return null;
    },

    log: (...a) => {
      console.log(...a);
      return null;
    }
  });
};
