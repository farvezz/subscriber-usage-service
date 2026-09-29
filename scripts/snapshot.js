/**
 * Snapshot script (Q2).
 *
 * Fetches the current subscriber usage data from the running API and saves
 * it as a CSV file under /snapshots.
 *
 * File naming convention:
 *   usage_snapshot_YYYY-MM-DD_HHmm.csv
 *   e.g. usage_snapshot_2026-09-29_0800.csv
 * This keeps files lexicographically sortable by date/time and makes the
 * capture run (08:00 / 12:00 / 15:00 WIB) obvious from the filename alone.
 *
 * Run manually:   node scripts/snapshot.js
 * Run on a schedule: see scripts/schedule.js (in-process) or the crontab
 * example in README.md (system cron, recommended for production).
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/usage';
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR || path.join(__dirname, '..', 'snapshots');

// WIB = UTC+7, no daylight saving, so this offset is constant.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function wibTimestampParts(date = new Date()) {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}`;
  const timeStr = `${pad(wib.getUTCHours())}${pad(wib.getUTCMinutes())}`;
  return { dateStr, timeStr };
}

function toCsv(records) {
  const header = ['id', 'subscriberId', 'callMinutes', 'smsCount', 'dataUsageMB', 'timestamp'];
  const lines = [header.join(',')];

  for (const r of records) {
    lines.push(header.map((field) => String(r[field] ?? '')).join(','));
  }

  return lines.join('\n') + '\n';
}

async function takeSnapshot() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch usage data: HTTP ${res.status}`);
  }
  const { records } = await res.json();

  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  const { dateStr, timeStr } = wibTimestampParts();
  const filename = `usage_snapshot_${dateStr}_${timeStr}.csv`;
  const filepath = path.join(SNAPSHOT_DIR, filename);

  fs.writeFileSync(filepath, toCsv(records), 'utf8');
  console.log(`Snapshot written: ${filepath} (${records.length} records)`);
  return filepath;
}

if (require.main === module) {
  takeSnapshot().catch((err) => {
    console.error('Snapshot failed:', err.message);
    process.exit(1);
  });
}

module.exports = { takeSnapshot, wibTimestampParts, toCsv };
