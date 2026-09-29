# Subscriber Usage Service — Technical Test

A backend service to record and retrieve subscriber usage (Q1), automation
to snapshot that data to CSV and prune old snapshots (Q2), reference SQL
for the subscriber/usage schema (Q3), and a fixed + explained bug (Q4).

## Stack

- Node.js (v18+) + Express — REST API
- In-memory storage (see note below)
- `node-cron` — optional in-process scheduler (Q2 alternative to system cron)
- Vanilla HTML/JS bonus frontend under `/public`

## Project structure

```
src/
  app.js                    Express app entrypoint
  routes/usageRoutes.js     Route definitions
  controllers/usageController.js  Request handlers
  store/usageStore.js       In-memory data store
  utils/validate.js         Input validation
public/
  index.html                Bonus frontend (record + list usage)
scripts/
  snapshot.js                Q2: fetch usage, write CSV
  cleanup.js                  Q2: delete CSV snapshots older than 30 days
  schedule.js                 Optional in-process cron (node-cron)
sql/
  queries.sql                 Q3: SQL answers
docs/
  Q4-troubleshoot.md          Q4: bug root cause, fix, and prevention
snapshots/                    CSV snapshot output directory
```

## Setup & running the API

```bash
npm install
npm start          # starts on http://localhost:3000
# or: npm run dev   (auto-restart on file changes, Node 18+)
```

Health check: `GET /health` → `{ "status": "ok" }`

A minimal frontend is served at `http://localhost:3000/` for recording and
viewing usage without curl/Postman.

## Q1 — API design

| Method | Endpoint                    | Purpose                                    |
|--------|------------------------------|---------------------------------------------|
| POST   | `/api/usage`                 | Record a new usage entry                    |
| GET    | `/api/usage`                 | List all usage records (optional filter)    |
| GET    | `/api/usage?subscriberId=X`  | List usage records for one subscriber       |
| GET    | `/api/usage/:subscriberId`   | Same as above, via path param; 404 if none  |

**POST /api/usage** request body:

```json
{ "subscriberId": "SUB01", "callMinutes": 40, "smsCount": 10, "dataUsageMB": 1500 }
```

Response — `201 Created`:

```json
{
  "id": 1,
  "subscriberId": "SUB01",
  "callMinutes": 40,
  "smsCount": 10,
  "dataUsageMB": 1500,
  "timestamp": "2026-09-29T00:11:49.667Z"
}
```

Validation errors return `400 Bad Request`:

```json
{ "error": "Validation failed", "details": ["callMinutes is required and must be a number."] }
```

**GET /api/usage** response — `200 OK`:

```json
{ "count": 2, "records": [ { "id": 1, "subscriberId": "SUB01", ... }, ... ] }
```

**GET /api/usage/:subscriberId** — `200 OK` with the same shape, or
`404 Not Found` if the subscriber has no recorded usage:

```json
{ "error": "No usage records found for subscriberId 'SUB99'" }
```

**Design notes / assumptions**

- Storage is in-memory (a plain array), as allowed by the brief — data
  resets on restart. It's isolated behind `src/store/usageStore.js` so
  swapping in Postgres/Mongo later only means rewriting that one file.
- `timestamp` is generated server-side (ISO 8601, UTC) if not supplied,
  so every record is comparably ordered regardless of client clock.
- All three usage fields are validated as non-negative numbers to avoid
  garbage data polluting snapshots and SQL aggregates downstream.

## Q2 — Snapshot automation

**Snapshot script** (`scripts/snapshot.js`): calls `GET /api/usage` on the
running API and writes the result as CSV into `/snapshots`.

**Naming convention:** `usage_snapshot_YYYY-MM-DD_HHmm.csv`
(e.g. `usage_snapshot_2026-09-29_0800.csv`), using **WIB (UTC+7)** clock
time — chosen so filenames sort chronologically and the capture slot
(08:00/12:00/15:00) is visible at a glance, without needing to open the
file.

**Cleanup script** (`scripts/cleanup.js`): deletes any
`usage_snapshot_*.csv` file whose *filename date* is older than 30 days.
Age is derived from the filename rather than filesystem mtime so behavior
is unaffected by copying/rsyncing files (which changes mtime) — and the
regex match means it only ever touches files matching our own naming
convention, never other files that might land in that folder.

### Scheduling (recommended: system crontab)

The API must be running for `snapshot.js` to have something to fetch from.

```bash
crontab -e
```

```cron
# Snapshot at 08:00, 12:00, 15:00 WIB (server assumed to run in WIB/Asia-Jakarta)
0 8,12,15 * * *  cd /path/to/subscriber-usage-service && /usr/bin/node scripts/snapshot.js >> /var/log/usage-snapshot.log 2>&1

# Daily cleanup of snapshots older than 30 days, run once at 00:30 WIB
30 0 * * *       cd /path/to/subscriber-usage-service && /usr/bin/node scripts/cleanup.js >> /var/log/usage-cleanup.log 2>&1
```

> If the server's system clock is UTC (WIB = UTC+7), shift the snapshot
> times back 7 hours: `0 1,5,8 * * *`. The crontab entries above assume
> the cron daemon itself is configured for the `Asia/Jakarta` timezone
> (e.g. via `CRON_TZ=Asia/Jakarta` on systems that support it).

### Alternative: in-process scheduler

If you don't have OS-level cron access (e.g. some PaaS environments), run:

```bash
npm run schedule
```

This uses `node-cron` with an explicit `Asia/Jakarta` timezone, so it's
correct regardless of the host's system timezone. Keep it running under
a process manager (pm2, systemd, Docker restart policy) since it's a
long-lived process, not a one-shot script like real cron jobs.

## Q3 — SQL

See [`sql/queries.sql`](sql/queries.sql) for:
1. Insert new subscriber (Fajar, Basic, 2024-01-24)
2. Update Fajar's plan to Premium
3. Total data usage for Premium-plan subscribers
4. Top 3 subscribers by total data usage
5. Subscribers with average call minutes per snapshot ≤ 30 (via subquery)

Written in PostgreSQL-flavored ANSI SQL; dialect-specific notes (MySQL
`AUTO_INCREMENT`, ANSI `FETCH FIRST`) are called out inline as comments.

## Q4 — Troubleshoot & Explain

See [`docs/Q4-troubleshoot.md`](docs/Q4-troubleshoot.md) for the root
cause (missing `return` in the `reduce` callback, and no initial value
passed to `reduce`), the fix, and how to prevent this class of bug
(linter rule, unit tests, TypeScript).

## Testing what's here

```bash
npm install
npm start &
curl -X POST localhost:3000/api/usage -H 'Content-Type: application/json' \
  -d '{"subscriberId":"SUB01","callMinutes":40,"smsCount":10,"dataUsageMB":1500}'
curl localhost:3000/api/usage
node scripts/snapshot.js       # writes a CSV into /snapshots
node scripts/cleanup.js        # no-op until files are >30 days old
```
