import { entity, text } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@entity()
export class Customer extends Source({
  schema: 'EDW',
  table: 'FIN_CUSTOMER_D',
  primaryKey: ['custAccountID'],
}) {
  @text({ column: 'CustAccountID', max: 8000 })
  custAccountID!: string;

  @text({ optional: true, column: 'AccountNumber', max: 8000 })
  accountNumber?: string;

  @text({ optional: true, column: 'PartyName', max: 8000 })
  partyName?: string;
}
