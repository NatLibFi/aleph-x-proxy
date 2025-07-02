import startApp from './app';
import * as params from './config';

run();

async function run() {
  // eslint-disable-next-line functional/no-let
  let server;

  registerInterruptionHandlers();
  // eslint-disable-next-line prefer-const
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
      // eslint-disable-next-line functional/no-conditional-statements
      if (server) {
        server.close();
      }

      // eslint-disable-next-line functional/no-conditional-statements
      if (message) {
        // eslint-disable-next-line no-console
        console.error(message);
      }

      // eslint-disable-next-line no-process-exit
      process.exit(code);
    }
  }
}
