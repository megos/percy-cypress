const createTestServer = require('@percy/core/test/helpers/server');

// mock testing site
createTestServer({
  default: () => [200, 'text/html', 'Snapshot Me']
}).then(({ close }) => {
  process.on('exit', close);
});

module.exports = on => {
  let percyServer;

  // register mocking tasks
  on('task', {
    // start mock percy server
    async 'mock:start'() {
      percyServer = percyServer || await createTestServer({
        default: () => [200, 'application/json', { success: true }]
      }, 5338);

      return null;
    },

    // stop mock percy server
    async 'mock:stop'() {
      await percyServer.close();
      percyServer = null;
      return null;
    },

    // yeilds to requests made to the mock percy server
    'mock:requests'() {
      return percyServer.requests;
    },

    // mocks a healthcheck failure
    'mock:healthcheck:fail'() {
      percyServer.reply('/percy/healthcheck', () => Promise.reject(new Error()));
      return null;
    },

    // mocks a healthcheck error
    'mock:healthcheck:error'() {
      percyServer.reply('/percy/healthcheck', req => req.connection.destroy());
      return null;
    },

    // mocks a snapshot error
    'mock:snapshot:error'() {
      percyServer.reply('/percy/snapshot', () => (
        [400, 'application/json', { success: false, error: 'testing' }]
      ));

      return null;
    }
  });
};
