import { entity, text, decimal, date } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@entity()
export class InvoiceLine extends Source({
  schema: 'EDW',
  table: 'FIN_AR_INVOICE_LINE_F',
  primaryKey: ['lineCustomerTrxLineID'],
}) {
  @text({ column: 'Line_CustomerTrxLineID', max: 8000 })
  lineCustomerTrxLineID!: string;

  @text({ optional: true, column: 'CustTrxTypeSeqID', max: 8000 })
  custTrxTypeSeqID?: string;

  @text({ optional: true, column: 'BatchSourceSeqID', max: 8000 })
  batchSourceSeqID?: string;

  @text({ optional: true, column: 'BillToCustomerID', max: 8000 })
  billToCustomerID?: string;

  @text({ optional: true, column: 'OrgID', max: 8000 })
  orgID?: string;

  @text({ optional: true, column: 'TrxNumber', max: 8000 })
  trxNumber?: string;

  @text({ optional: true, column: 'TrxClass', max: 8000 })
  trxClass?: string;

  @date({ optional: true, column: 'TrxDate' })
  trxDate?: Date;

  @decimal({ optional: true, column: 'Line_ExtendedAmount', precision: 18, scale: 2 })
  lineExtendedAmount?: number;
}
