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
import parseXML from 'xml2js';
import moment from 'moment';
import {Utils} from '@natlibfi/melinda-commons';

const INDEXING_SEQUENCE_FORMAT = 'YYYYMMDDHHmmsss';

export default ({pool, alephLibrary, indexingPriority}) => {
	const {createLogger} = Utils;
	const logger = createLogger();

	return async res => {
		return res.status === HttpStatus.OK ? handle() : undefined;

		async function handle() {
			const payload = parsePayload();
			const id = getId();

			return id ? updateIndexing() : undefined;

			async function parsePayload() {
				return new Promise((resolve, reject) => {
					const buffer = [];

					res
						.on('error', reject)
						.on('end', parseXML(buffer.join('')))
						.on('data', chunk => buffer.push(chunk));
				});
			}

			function getId() {
				const pattern = /^Document: [0-9]{9} was updated succesfully\.$/;
				const message = payload['update-doc'].error.find(m => pattern.test(m));
				return message ? pattern.exec(message)[1] : undefined;
			}

			async function updateIndexing() {
				let connection;

				try {
					logger.log('info', `Updating indexing for record ${id}`);

					connection = await pool.getConnection();

					const query = `UPDATE ${alephLibrary}.z07 SET z07_sequence = :value WHERE z07_rec_key :id`;
					const args = {id, value: generateSequence()};

					const {resultSet} = await connection.execute(query, args, {resultSet: true});

					// Log, if updating was done or not

					await resultSet.close();
				} finally {
					await connection.close();
				}

				function generateSequence() {
					const time = moment();
					moment.set('year', indexingPriority);
					return time.format(INDEXING_SEQUENCE_FORMAT);
				}
			}
		}
	};
};
