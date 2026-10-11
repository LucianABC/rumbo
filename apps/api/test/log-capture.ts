import { Writable } from 'node:stream';

/** Collects the JSON log lines the app writes, so tests can assert on them. */
export function captureLogs() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      for (const line of chunk.toString().split('\n').filter(Boolean)) {
        lines.push(JSON.parse(line) as Record<string, unknown>);
      }
      callback();
    },
  });
  return { lines, destination };
}
