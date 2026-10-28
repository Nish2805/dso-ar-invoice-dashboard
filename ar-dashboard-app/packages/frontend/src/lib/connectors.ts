// #region rayfin:app-owned — copied verbatim by the Rayfin CLI; edit freely.
//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
  ConnectorConfig,
  ConnectorsRuntime,
} from '@microsoft/rayfin-connectors';
// #endregion rayfin:app-owned

import {
  connectorConfig as lhDiezCrmConfig,
  type LhDiezCrmSchema,
} from '../../../../rayfin/connectors/lh_diez_crm/schema';

export type AppConnectorsSchema = {
  lh_diez_crm: LhDiezCrmSchema;
};

export const connectorConfigs: Record<string, ConnectorConfig> = {
  lh_diez_crm: lhDiezCrmConfig,
};

export const connectorRuntimes: ConnectorsRuntime = {};
