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

import HttpStatus from 'http-status';
import stringToStream from 'into-stream';
import {parseString as parseXMLOrig} from 'xml2js';
import {createProxyServer} from 'http-proxy';
import moment from 'moment';
import {promisify} from 'util';
import {Utils} from '@natlibfi/melinda-commons';

export default ({pool, alephLibrary, alephXServiceUrl, indexingPriority}) => {
  const INDEXING_SEQUENCE_FORMAT = 'YYYYMMDDHHmmssS';

  const {createLogger} = Utils;
  const parseXML = promisify(parseXMLOrig);
  const logger = createLogger();
  const proxy = createProxyServer();

  proxy.on('proxyRes', handleResponse);
  proxy.on('error', (err, _, next) => next(err));

  return async (req, res) => {
    const reqPayload = await readPayload(req);

    // eslint-disable-next-line functional/immutable-data,require-atomic-updates
    req.isRecordUpdate = ((/op=update_doc/u).test(reqPayload) || (/op=update-doc/u).test(reqPayload)) &&
      (/doc_number=0{9}/u).test(reqPayload) === false &&
      (/doc_num=0{9}/u).test(reqPayload) === false &&
      (/rec_num= /u).test(reqPayload) === false;

    logger.log('debug', req.isRecordUpdate
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
      const id = getId();

      return id ? updateIndexing() : undefined;

      function getId() {
        const pattern = (/Document: (?:[0-9]{9}) was updated successfully\.$/u);

        if ('update-doc' in payload) {
          const message = payload['update-doc'].error.find(m => pattern.test(m));
          return message ? pattern.exec(message)[1] : undefined;
        }
      }

      async function updateIndexing() {
        let connection; // eslint-disable-line functional/no-let

        try {
          logger.log('info', `Updating indexing for record ${id}`);

          connection = await pool.getConnection();

          const query = `UPDATE ${alephLibrary}.z07 SET z07_sequence = :value WHERE z07_rec_key = :id`;
          const args = {id, value: generateSequence()};

          logger.log('debug', `Executing query: '${query}' with args: ${JSON.stringify(args)}`);

          const {rowsAffected} = await connection.execute(query, args, {autoCommit: true});

          logger.log('info', rowsAffected
            ? `Indexing priority updated successfully for record ${id}`
            : `Record ${id} already indexed`);
        } finally {
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

  function readPayload(msg) {
    return new Promise((resolve, reject) => {
      const buffer = [];

      msg
        .on('error', reject)
        .on('data', chunk => buffer.push(chunk)) // eslint-disable-line functional/immutable-data
        .on('end', () => resolve(buffer.join('')));
    });
  }
};
