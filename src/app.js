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

import express from 'express';
import oracledb from 'oracledb';
import HttpStatus from 'http-status';
import {createLogger, createExpressLogger} from '@natlibfi/melinda-backend-commons';
import {URLSearchParams} from 'url';
import createMiddleware from './middleware';

export default async function ({
  enableProxy, httpPort,
  alephLibrary, alephXServiceUrl, indexingPriority,
  oracleUsername, oraclePassword, oracleConnectString
}) {
  const logger = createLogger();

  const pool = await initOracle();
  const server = initExpress();

  server.on('close', async () => {
    logger.debug(`Server close, closing pool.`);
    await pool.close(0);
  });

  return server;

  async function initOracle() {
    logger.debug(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');
    setOracleOptions();

    logger.debug('Establishing connection to database...');
    logger.debug(`Oracle connectstring: ${oracleConnectString}`);

    const pool = await oracledb.createPool({
      user: oracleUsername, password: oraclePassword,
      connectString: oracleConnectString
    });

    testConnection(pool);

    logger.debug('Connected to database!');
    logger.debug(`Pool debug: `);

    return pool;

    function setOracleOptions() {
      // eslint-disable-next-line functional/immutable-data
      oracledb.outFormat = oracledb.OBJECT;
      // eslint-disable-next-line functional/immutable-data
      oracledb.poolTimeout = 20;
      // eslint-disable-next-line functional/immutable-data
      oracledb.events = false;
      // eslint-disable-next-line functional/immutable-data
      oracledb.poolPingInterval = 10;
    }
  }

  function initExpress() {
    const app = express();

    // eslint-disable-next-line functional/no-conditional-statements
    if (enableProxy) {
      app.enable('trust proxy', true);
    }

    app.use(createExpressLogger({
      msg: formatMessage
    }));

    app.use(createMiddleware({pool, alephLibrary, indexingPriority, alephXServiceUrl}));

    app.use(handleError);

    return app.listen(httpPort, () => logger.log('info', 'Started Aleph X-proxy'));

    function formatMessage(req, res) {
      const newUrl = format();
      return `${req.ip} HTTP ${req.method} ${newUrl} - ${res.statusCode} ${res.responseTime}ms`;

      function format() {
        const [path, query] = req.url.split(/\?/u);
        const params = new URLSearchParams(query);

        params.delete('staff_user');
        params.delete('staff_pass');

        return `${path}?${params.toString()}`;
      }
    }

    // eslint-disable-next-line require-await
    async function handleError(err, req, res, next) { // eslint-disable-line no-unused-vars
      const {
        INTERNAL_SERVER_ERROR,
        REQUEST_TIMEOUT
      } = HttpStatus;

      // Certain Oracle errors don't matter if the request was closed by the client
      if (err.message && err.message.startsWith('NJS-018:') && req.aborted) {
        logger.debug(`Request was closed by client, let's not mind closed connection`);
        res.sendStatus(REQUEST_TIMEOUT);
        return;
      }
      logger.debug(`We got an error!`);
      res.sendStatus(INTERNAL_SERVER_ERROR);
      throw err;
    }
  }

  async function testConnection(pool) {
    const connection = await pool.getConnection();
    //logger.debug(connection.isHealthy());
    logger.debug(`We tested a connection:`);
    await connection.close();
  }

}
