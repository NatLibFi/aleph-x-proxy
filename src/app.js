import express from 'express';
import oracledb from 'oracledb';
import HttpStatus from 'http-status';
import {createLogger, createExpressLogger} from '@natlibfi/melinda-backend-commons';
import {URLSearchParams} from 'url';
import {default as createMiddleware} from './middleware.js';
import ipRangeCheck from 'ip-range-check';

// eslint-disable-next-line max-lines-per-function
export default async function ({
  enableProxy, httpPort,
  alephLibrary, alephXServiceUrl, indexingPriority,
  oracleUsername, oraclePassword, oracleConnectString,
  ipWhiteList
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
    //logger.debug(`Pool debug: `);

    return pool;

    function setOracleOptions() {
      oracledb.outFormat = oracledb.OBJECT;
      oracledb.poolTimeout = 20;
      oracledb.events = false;
      oracledb.poolPingInterval = 10;
    }
  }

  function initExpress() {
    const app = express();

    if (enableProxy) {
      app.enable('trust proxy', true);
    }

    app.use(createExpressLogger({
      msg: formatMessage
    }));

    app.use(ipWhiteListMiddleware);
    app.use(createMiddleware({pool, alephLibrary, indexingPriority, alephXServiceUrl}));

    app.use(handleError);

    return app.listen(httpPort, () => logger.info('Started Aleph X-proxy'));

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

    // IP_WHITELIST defaults to empty, which is used for no restrictions
    // Note that using IP_WHITELIST requires 'cf-connecting-ip' header in request, all requests without it are denied
    function ipWhiteListMiddleware(req, res, next) {
      logger.verbose('Ip whitelist middleware');
      if (ipWhiteList.length === 0) {
        return next();
      }
      const connectionIp = req.headers['cf-connecting-ip'];
      if (ipRangeCheck(`${connectionIp}`, ipWhiteList)) {
        logger.debug('IP ok');
        return next();
      }

      logger.debug(`Bad IP: ${req.headers['cf-connecting-ip']}`);
      return res.sendStatus(HttpStatus.FORBIDDEN);
    }

     
    async function handleError(err, req, res, next) {  
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
