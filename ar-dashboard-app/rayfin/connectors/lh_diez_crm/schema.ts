import type { GraphQLBackedConnector } from '@microsoft/rayfin-connector-fabric-graphql';
import type { ConnectorConfig } from '@microsoft/rayfin-connectors';

import { InvoiceLine } from './InvoiceLine.js';
import { RecordType } from './RecordType.js';
import { Customer } from './Customer.js';
import { BusinessUnit } from './BusinessUnit.js';
import { InvoiceSource } from './InvoiceSource.js';

export { InvoiceLine } from './InvoiceLine.js';
export { RecordType } from './RecordType.js';
export { Customer } from './Customer.js';
export { BusinessUnit } from './BusinessUnit.js';
export { InvoiceSource } from './InvoiceSource.js';

export const connectorConfig = {
  connector: 'fabric-sqlanalytics',
  operations: ['read'],
  entities: { InvoiceLine, RecordType, Customer, BusinessUnit, InvoiceSource },
} as const satisfies ConnectorConfig;

export type LhDiezCrmSchema = GraphQLBackedConnector<
  {
    InvoiceLine: typeof InvoiceLine;
    RecordType: typeof RecordType;
    Customer: typeof Customer;
    BusinessUnit: typeof BusinessUnit;
    InvoiceSource: typeof InvoiceSource;
  },
  typeof connectorConfig
>;
