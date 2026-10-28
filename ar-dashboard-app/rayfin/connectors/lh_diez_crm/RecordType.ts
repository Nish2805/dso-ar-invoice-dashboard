import { entity, text } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@entity()
export class RecordType extends Source({
  schema: 'EDW',
  table: 'FIN_RECORDTYPE_D',
  primaryKey: ['custTrxTypeSeqID'],
}) {
  @text({ column: 'CustTrxTypeSeqID', max: 8000 })
  custTrxTypeSeqID!: string;

  @text({ optional: true, column: 'Meaning', max: 8000 })
  meaning?: string;

  @text({ optional: true, column: 'Name', max: 8000 })
  name?: string;
}
