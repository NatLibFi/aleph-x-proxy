/**
* Copyright 2019 University Of Helsinki (The National Library Of Finland)
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

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
