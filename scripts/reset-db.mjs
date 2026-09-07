/**
 * Deletes the SQLite database so the next boot recreates an empty schema.
 * Usage: npm run db:reset
 */
import fs from "node:fs";
import path from "node:path";

const rel = process.env.DATABASE_PATH || "./data/resonate.db";
const file = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);

let removed = 0;
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  const target = `${file}${suffix}`;
  if (fs.existsSync(target)) {
    fs.rmSync(target);
    removed += 1;
    console.log(`removed ${path.relative(process.cwd(), target)}`);
  }
}

console.log(removed ? "Database reset. It will be recreated on next start." : "Nothing to remove.");
