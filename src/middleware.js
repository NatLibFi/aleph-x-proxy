import HttpStatus from 'http-status';
import stringToStream from 'into-stream';
import {parseString as parseXMLOrig} from 'xml2js';
import {createProxyServer} from 'http-proxy-3';
import moment from 'moment';
import {promisify} from 'util';
import {createLogger} from '@natlibfi/melinda-backend-commons';

export default ({pool, alephLibrary, alephXServiceUrl, indexingPriority}) => {
  const INDEXING_SEQUENCE_FORMAT = 'YYYYMMDDHHmmssS';

  const parseXML = promisify(parseXMLOrig);
  const logger = createLogger();
  const proxy = createProxyServer();

  proxy.on('proxyRes', handleResponse);
  proxy.on('error', (err, _, next) => next(err));

  return async (req, res) => {
    const reqPayload = await readPayload(req);

    // eslint-disable-next-line functional/immutable-data, require-atomic-updates
    req.isRecordUpdate = ((/op=update_doc/u).test(reqPayload) || (/op=update-doc/u).test(reqPayload)) &&
    //  require op=update_doc or op=update-doc, but
    // ignore all zeroes or empty doc_number/doc_num/rec_num - these are creates!
                         (/doc_number=0{9}/u).test(reqPayload) === false &&
                         (/doc_num=0{9}/u).test(reqPayload) === false &&
                         (/rec_num= /u).test(reqPayload) === false;

    logger.debug(req.isRecordUpdate
      ? 'Request is record update.'
      : 'Request is not record update.');

    proxy.web(req, res, {
      target: alephXServiceUrl,
      changeOrigin: true,
      buffer: stringToStream(reqPayload)
    });
  };

  async function handleResponse(proxyRes, req) {
    const resPayload = await readPayload(proxyRes);

    if (proxyRes.statusCode === HttpStatus.OK && resPayload && req.isRecordUpdate) {
      return handle();
    }

    async function handle() {
      const payload = await parseXML(resPayload);
      logger.silly(`Got payload: ${JSON.stringify(resPayload)}`);
      const id = getId();
      logger.silly(`Got ID: ${id}`);

      return id ? updateIndexing() : undefined;

      function getId() {
        const pattern = /Document: (?<sys>[0-9]{9}) was updated successfully\.$/u;

        if ('update-doc' in payload) {
          const message = payload['update-doc'].error.find(m => pattern.test(m));
          return message ? pattern.exec(message)[1] : undefined;
        }
      }

      async function updateIndexing() {
        // eslint-disable-next-line functional/no-let
        let connection;
        logger.silly(`Update indexing.`);

        try {
          logger.info(`Updating indexing for record ${id}`);
          logger.silly(pool === undefined ? `pool is undefined` : `pool exists`);
          connection = await pool.getConnection();
          logger.silly(`Did we get a connection?`);

          const query = `UPDATE ${alephLibrary}.z07 SET z07_sequence = :value WHERE z07_rec_key = :id`;
          const args = {id, value: generateSequence()};
          logger.silly(`We got args: ${JSON.stringify(args)}`);

          logger.silly(`Executing query: '${query}' with args: ${JSON.stringify(args)}`);

          const {rowsAffected} = await connection.execute(query, args, {autoCommit: true});

          logger.info(rowsAffected
            ? `Indexing priority updated successfully for record ${id}`
            : `Record ${id} already indexed`);
        } finally {
          logger.debug(`Closing connection.`);
          await connection.close();
        }

        function generateSequence() {
          const time = moment();
          time.set('year', indexingPriority);
          return time.format(INDEXING_SEQUENCE_FORMAT);
        }
      }
    }
  }

  // eslint-disable-next-line require-await
  async function readPayload(msg) {
    return new Promise((resolve, reject) => {
      logger.silly(`ReadPayload`);
      const buffer = [];

      msg
        .on('error', reject)
        // eslint-disable-next-line functional/immutable-data
        .on('data', chunk => buffer.push(chunk))
        .on('end', () => resolve(buffer.join('')));
    });
  }
};
