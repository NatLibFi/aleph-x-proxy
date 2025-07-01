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
