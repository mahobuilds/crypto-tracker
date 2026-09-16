import { describe, expect, it } from 'vitest';
import { parseCsv } from './parse';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('trims whitespace around unquoted fields', () => {
    expect(parseCsv('a, b ,c\n')).toEqual([['a', 'b', 'c']]);
  });

  it('handles quoted fields containing commas', () => {
    expect(parseCsv('a,b\n1,"2,200"')).toEqual([
      ['a', 'b'],
      ['1', '2,200'],
    ]);
  });

  it('preserves whitespace inside quotes', () => {
    expect(parseCsv('a\n"  spaced  "')).toEqual([['a'], ['  spaced  ']]);
  });

  it('handles quoted fields containing newlines', () => {
    expect(parseCsv('a,b\n"line1\nline2",x')).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ]);
  });

  it('handles escaped double quotes inside quoted fields', () => {
    expect(parseCsv('a\n"she said ""hi"""')).toEqual([['a'], ['she said "hi"']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('handles bare CR line endings', () => {
    expect(parseCsv('a,b\r1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips a UTF-8 BOM at the start of the text', () => {
    expect(parseCsv('﻿a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ignores a trailing newline', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ignores multiple trailing empty lines', () => {
    expect(parseCsv('a,b\n1,2\n\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('produces an empty record for an interior blank line', () => {
    expect(parseCsv('a,b\n\n1,2')).toEqual([['a', 'b'], [], ['1', '2']]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
