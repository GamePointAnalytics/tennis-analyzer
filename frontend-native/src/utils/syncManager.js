import {
  getPendingMatches,
  getPoints,
  markMatchSynced,
  markPointsSynced,
  getMatchIndexes,
  importCloudMatch,
  deleteSyncedMatchesNotOwnedBy,
} from '../database/db';
import { syncMatchToCloud, syncPointsToCloud, fetchMatchesFromCloud } from './api';
import { getSettings } from './settings';

// Module-level lock — prevents concurrent syncs if multiple triggers fire at once
let syncInProgress = false;

export async function syncPendingData() {
  if (syncInProgress) {
    return { success: true, syncedCount: 0, importedCount: 0 }; // already running, skip silently
  }
  syncInProgress = true;

  try {
    // ── Phase 1: Push — upload any locally pending matches ──────────────────
    let syncedCount = 0;
    const pushErrors = [];

    let pendingMatches = [];
    try {
      pendingMatches = await getPendingMatches();
    } catch (error) {
      console.error('Failed to read pending matches from DB:', error);
      // Don't abort — still attempt the pull phase below
    }

    for (const match of pendingMatches) {
      const matchIndex = match.matchIndex;
      try {
        await syncMatchToCloud(match);
        const pointsList = await getPoints(matchIndex);
        await syncPointsToCloud(matchIndex, pointsList, match.player1, match.player2, match.user, match.adScoring);
        const now = new Date().toISOString();
        await markMatchSynced(matchIndex, now);
        await markPointsSynced(matchIndex);
        syncedCount++;
      } catch (error) {
        console.error(`Sync failed for match ${matchIndex}:`, error);
        pushErrors.push(`${matchIndex}: ${error.message}`);
      }
    }

    // ── Phase 2: Pull — download matches from cloud not in local SQLite ──────
    let importedCount = 0;
    try {
      const settings = await getSettings();
      const userId = settings.userId;

      if (userId) {
        // ── Clean up: remove cloud-imported matches from a different user ──
        // This handles the case where the user changed their User ID in Settings.
        // Locally-created ('pending') matches are never deleted — only 'synced' ones.
        await deleteSyncedMatchesNotOwnedBy(userId);

        const cloudMatches = await fetchMatchesFromCloud(userId);

        if (Array.isArray(cloudMatches) && cloudMatches.length > 0) {
          // Get the current set of local match IDs (includes just-pushed ones)
          const localIndexes = await getMatchIndexes();

          for (const cloudMatch of cloudMatches) {
            const mi = String(cloudMatch['match index'] || '');
            if (mi && !localIndexes.has(mi)) {
              try {
                await importCloudMatch(cloudMatch);
                importedCount++;
              } catch (importErr) {
                console.warn(`Failed to import match ${mi}:`, importErr.message);
              }
            }
          }
        }
      }
    } catch (pullError) {
      // Pull failure is non-fatal — user still gets locally pushed data
      console.warn('Pull from cloud failed:', pullError.message);
    }

    // ── Return combined result ───────────────────────────────────────────────
    const pushFailed = pushErrors.length > 0;
    if (!pushFailed) {
      return { success: true, syncedCount, importedCount };
    } else if (syncedCount === 0) {
      return { success: false, error: pushErrors.join('; '), syncedCount: 0, importedCount };
    } else {
      return {
        success: false,
        error: `Partial upload: ${syncedCount} succeeded, ${pushErrors.length} failed. ${pushErrors.join('; ')}`,
        syncedCount,
        importedCount,
      };
    }
  } finally {
    syncInProgress = false;
  }
}
