/**
 * Cleanup script (Q2).
 *
 * Deletes CSV snapshot files older than 30 days from /snapshots.
 * "Age" is based on the date encoded in the filename
 * (usage_snapshot_YYYY-MM-DD_HHmm.csv), not filesystem mtime, so the
 * behaviour is stable even if files are copied/moved and their mtime
 * changes.
 *
 * Run manually: node scripts/cleanup.js
 * Schedule daily via cron (see README.md).
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR || path.join(__dirname, '..', 'snapshots');
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 30);

const FILENAME_PATTERN = /^usage_snapshot_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})\.csv$/;

function parseSnapshotDate(filename) {
  const match = filename.match(FILENAME_PATTERN);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  // Treat the encoded date as WIB and convert back to a UTC Date for comparison.
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - 7 * 60 * 60 * 1000;
  return new Date(utcMs);
}

function cleanupOldSnapshots() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    console.log(`Snapshot directory does not exist: ${SNAPSHOT_DIR}`);
    return [];
  }

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const removed = [];

  for (const filename of fs.readdirSync(SNAPSHOT_DIR)) {
    // Only ever touch files matching our own naming convention.
    const snapshotDate = parseSnapshotDate(filename);
    if (!snapshotDate) continue;

    if (snapshotDate.getTime() < cutoff) {
      fs.unlinkSync(path.join(SNAPSHOT_DIR, filename));
      removed.push(filename);
    }
  }

  console.log(
    removed.length
      ? `Removed ${removed.length} snapshot(s) older than ${RETENTION_DAYS} days:\n  ${removed.join('\n  ')}`
      : `No snapshots older than ${RETENTION_DAYS} days.`
  );
  return removed;
}

if (require.main === module) {
  cleanupOldSnapshots();
}

module.exports = { cleanupOldSnapshots, parseSnapshotDate };
