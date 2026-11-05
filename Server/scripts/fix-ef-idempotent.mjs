import fs from 'node:fs';
import path from 'node:path';

// EF Core's idempotent SQL wraps CREATE OR ALTER in IF blocks. SQL Server
// still parses those statements as non-first-in-batch. Escape them into EXEC.
const root = path.resolve(import.meta.dirname, '../..');
const dir = path.join(root, 'docs/architecture/database/phase-b');
const input = path.join(dir, 'migrations-idempotent.sql');
const output = path.join(dir, 'migrations-idempotent-runnable.sql');
const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/);
const fixed = [];
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (!/^    CREATE OR ALTER (?:FUNCTION|TRIGGER|PROCEDURE)\b/.test(lines[i])) {
    fixed.push(lines[i]);
    continue;
  }
  let j = i + 1;
  while (j < lines.length && lines[j] !== 'END;') j++;
  if (j === lines.length) throw new Error(`No idempotent wrapper end after line ${i + 1}`);
  const body = lines.slice(i, j).map(line => line.startsWith('    ') ? line.slice(4) : line).join('\n');
  fixed.push(`    EXEC(N'${body.replaceAll("'", "''")}');`);
  i = j - 1;
  count++;
}
if (count === 0) throw new Error('No CREATE OR ALTER statements transformed');
fs.writeFileSync(output, fixed.join('\r\n'));
console.log(`wrapped=${count}; output=${output}`);
