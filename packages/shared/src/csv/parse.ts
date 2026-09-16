/**
 * Dependency-free RFC 4180-ish CSV tokenizer.
 *
 * - Field separator is `,`; records are separated by `\n`, `\r\n`, or `\r`.
 * - Double-quoted fields may contain commas, newlines, and escaped quotes (`""`).
 * - A UTF-8 BOM at the start of the text is stripped.
 * - Trailing empty line(s) are ignored; interior blank lines produce an empty
 *   record (`[]`) that callers are expected to skip.
 * - Whitespace around unquoted fields is trimmed; whitespace inside quotes is
 *   preserved exactly as written.
 */
export function parseCsv(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldHadQuotes = false;
  let sawFieldOrRecord = false;

  const pushField = (): void => {
    record.push(fieldHadQuotes ? field : field.trim());
    field = '';
    fieldHadQuotes = false;
  };

  const pushRecord = (): void => {
    if (!sawFieldOrRecord) {
      // Blank line: produce an empty record instead of a single empty field.
      records.push(record);
      record = [];
      return;
    }
    pushField();
    records.push(record);
    record = [];
  };

  let i = 0;
  const length = source.length;
  while (i < length) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"' && field === '') {
      inQuotes = true;
      fieldHadQuotes = true;
      sawFieldOrRecord = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      pushField();
      sawFieldOrRecord = true;
      i += 1;
      continue;
    }

    if (char === '\r' || char === '\n') {
      pushRecord();
      sawFieldOrRecord = false;
      if (char === '\r' && source[i + 1] === '\n') {
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }

    field += char;
    sawFieldOrRecord = true;
    i += 1;
  }

  if (sawFieldOrRecord || field !== '' || record.length > 0) {
    pushRecord();
  }

  // Trailing empty line(s) are ignored entirely; interior blank lines are
  // kept as empty records for the caller to skip.
  while (records.length > 0 && records[records.length - 1]?.length === 0) {
    records.pop();
  }

  return records;
}
