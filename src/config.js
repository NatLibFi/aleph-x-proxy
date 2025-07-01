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


import {readEnvironmentVariable} from '@natlibfi/melinda-backend-commons';

export const alephLibrary = readEnvironmentVariable('ALEPH_LIBRARY');
export const alephXServiceUrl = readEnvironmentVariable('ALEPH_X_SERVICE_URL');

export const indexingPriority = readEnvironmentVariable('INDEXING_PRIORITY', {defaultValue: '1998'});

export const httpPort = readEnvironmentVariable('HTTP_PORT', {defaultValue: '8080'});
export const enableProxy = readEnvironmentVariable('ENABLE_PROXY', {defaultValue: ''});

export const oracleUsername = readEnvironmentVariable('ORACLE_USERNAME');
export const oraclePassword = readEnvironmentVariable('ORACLE_PASSWORD');
export const oracleConnectString = readEnvironmentVariable('ORACLE_CONNECT_STRING');

export const ipWhiteList = readEnvironmentVariable('IP_WHITELIST', {defaultValue: [], format: v => JSON.parse(v)});
