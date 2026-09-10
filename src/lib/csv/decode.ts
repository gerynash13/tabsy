import iconv from 'iconv-lite'

// Excel on Japanese-locale Windows very commonly exports CSV as
// Shift-JIS (CP932), not UTF-8. Try strict UTF-8 first; if that throws
// (which invalid Shift-JIS bytes reliably do when decoded as UTF-8),
// fall back to Shift-JIS. This is a heuristic, not a guarantee, but it
// covers the actual real-world case this project cares about.
export function decodeCsv(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return iconv.decode(buffer, 'Shift_JIS')
  }
}
