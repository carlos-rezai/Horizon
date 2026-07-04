import { config } from "dotenv";
import { copyFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// Copies the committed handoff seed over the local dev database, so a
// developer can reset to a known-good dataset with `npm run db:reset`.
// The seed lives in fixtures/ (a single consolidated file, no -wal/-shm);
// the dev DB path comes from HORIZON_DB_PATH in server/.env — the same file
// server.ts loads — so reset and the running server target the same DB.

config({ path: "server/.env" });

const SEED = "fixtures/horizon-seed.db";
const target = process.env.HORIZON_DB_PATH ?? "./.data/horizon.db";

if (!existsSync(SEED)) {
  console.error(`Seed not found: ${SEED}`);
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });

// Drop stale WAL/SHM so the reset is a clean snapshot, not a merge.
for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${target}${suffix}`, { force: true });
}

copyFileSync(SEED, target);
console.log(`Reset ${target} from ${SEED}`);
