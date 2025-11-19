import startApp from './app.js';
import * as params from './config.js';

run();

async function run() {
  let server;

  registerInterruptionHandlers();
  server = await startApp(params);

  function registerInterruptionHandlers() {
    process.on('SIGTERM', handleSignal);
    process.on('SIGINT', handleSignal);

    process.on('uncaughtException', ({stack}) => {
      handleTermination({code: 1, message: stack});
    });

    process.on('unhandledRejection', ({stack}) => {
      handleTermination({code: 1, message: stack});
    });

    function handleSignal(signal) {
      handleTermination({code: 1, message: `Received ${signal}`});
    }

    function handleTermination({code = 0, message}) {
      if (server) {
        server.close();
      }

      if (message) {
        // eslint-disable-next-line no-console
        console.error(message);
      }

      process.exit(code);
    }
  }
}
