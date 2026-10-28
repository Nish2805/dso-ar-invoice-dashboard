import { entity, text } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@entity()
export class BusinessUnit extends Source({
  schema: 'EDW',
  table: 'FIN_BUSINESSUNIT_D',
  primaryKey: ['buID'],
}) {
  @text({ column: 'BuID', max: 8000 })
  buID!: string;

  @text({ optional: true, column: 'BuName', max: 8000 })
  buName?: string;
}
