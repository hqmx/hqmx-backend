/**
 * File Cleanup Utility - $ò Ñ‹ | êŸ ¨
 *
 * node-cronD ¨©XÏ ¸0<\ Ñ‹ | ≠
 * 1‹ Ω¸\ | êŸ ≠
 */

import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';

const CLEANUP_AGE_MS = parseInt(process.env.CLEANUP_AGE_HOURS || '1') * 60 * 60 * 1000; // 1‹
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/converter/uploads';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/converter/outputs';

/**
 * 	†¨ ¥ $ò | ≠
 * @param {string} dir - ¨` 	†¨
 * @returns {Promise<number>} ≠ | 
 */
async function cleanupDirectory(dir) {
  try {
    const files = await fs.readdir(dir);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(dir, file);

      try {
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > CLEANUP_AGE_MS) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`[Cleanup] Deleted: ${file} (age: ${Math.round(age / 60000)}min)`);
        }
      } catch (err) {
        console.warn(`[Cleanup] Could not delete ${file}:`, err.message);
      }
    }

    return deletedCount;
  } catch (err) {
    console.error(`[Cleanup] Error cleaning directory ${dir}:`, err);
    return 0;
  }
}

/**
 * ¥ | ¨ ‰â
 */
async function runCleanup() {
  console.log('[Cleanup] Starting file cleanup...');

  try {
    const uploadDeleted = await cleanupDirectory(UPLOAD_DIR);
    const outputDeleted = await cleanupDirectory(OUTPUT_DIR);

    const total = uploadDeleted + outputDeleted;
    if (total > 0) {
      console.log(`[Cleanup] Completed: ${total} files deleted (${uploadDeleted} uploads, ${outputDeleted} outputs)`);
    } else {
      console.log('[Cleanup] Completed: No old files to delete');
    }
  } catch (err) {
    console.error('[Cleanup] Error during cleanup:', err);
  }
}

/**
 * Cron job ‹ë - ‰ 10Ñ»‰ ‰â
 */
export function startCleanupCron() {
  // ‰ 10Ñ»‰ ‰â: */10 * * * *
  cron.schedule('*/10 * * * *', async () => {
    await runCleanup();
  });

  console.log(`[Cleanup] Cron job started (every 10 minutes, age threshold: ${CLEANUP_AGE_MS / 60000}min)`);

  // q ‹ë ‹ \ à ‰â
  runCleanup();
}

/**
 * Ÿ ¨ (API î L§∏©)
 */
export async function manualCleanup() {
  return await runCleanup();
}

/**
 * π jobX | ≠
 * @param {string} jobId - Job ID
 */
export async function deleteJobFiles(jobId) {
  try {
    const uploadFiles = await fs.readdir(UPLOAD_DIR);
    const outputFiles = await fs.readdir(OUTPUT_DIR);

    let deletedCount = 0;

    // ≈\‹ | ≠
    for (const file of uploadFiles) {
      if (file.startsWith(jobId)) {
        await fs.unlink(path.join(UPLOAD_DIR, file));
        deletedCount++;
        console.log(`[Cleanup] Deleted upload file: ${file}`);
      }
    }

    // ú% | ≠
    for (const file of outputFiles) {
      if (file.startsWith(jobId)) {
        await fs.unlink(path.join(OUTPUT_DIR, file));
        deletedCount++;
        console.log(`[Cleanup] Deleted output file: ${file}`);
      }
    }

    return deletedCount;
  } catch (err) {
    console.error(`[Cleanup] Error deleting job ${jobId} files:`, err);
    throw err;
  }
}

export default {
  startCleanupCron,
  manualCleanup,
  deleteJobFiles
};
