import { entity, text } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@entity()
export class InvoiceSource extends Source({
  schema: 'EDW',
  table: 'FIN_AR_INVOICE_SOURCE_D',
  primaryKey: ['batchSourceSeqID'],
}) {
  @text({ column: 'BatchSourceSeqID', max: 8000 })
  batchSourceSeqID!: string;

  @text({ optional: true, column: 'Name', max: 8000 })
  name?: string;
}
