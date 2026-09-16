import { CSV_COLUMNS } from './rows';

const HEADER = CSV_COLUMNS.join(',');

const ROWS = [
  '2025-01-15T09:30:00Z,buy,bitcoin,0.5,42000,USD,10,',
  '2025-02-01T12:00:00Z,buy,ethereum,2,2200,USD,5,"First ETH buy, via exchange"',
  '2025-03-10T16:45:00Z,sell,bitcoin,0.2,45000,USD,8,',
];

/** Downloadable sample CSV, matching `CSV_COLUMNS`. Parses with zero errors. */
export const SAMPLE_CSV = [HEADER, ...ROWS].join('\n');
