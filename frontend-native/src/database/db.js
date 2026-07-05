import * as SQLite from 'expo-sqlite';

let db = null;

// Initialize Database connection and create tables
export async function initializeDb() {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('tennis_analyzer.db');
  
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Create tables matches and points
  // We use snake_case for SQLite columns internally but we'll map them to the 
  // exact column names of Google Sheets when querying or syncing.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS matches (
      matchIndex TEXT PRIMARY KEY,
      user TEXT,
      player1 TEXT,
      player2 TEXT,
      tournament TEXT,
      date TEXT,
      location TEXT,
      adScoring TEXT,
      notes TEXT,
      syncStatus TEXT DEFAULT 'pending',
      lastSynced TEXT
    );
  `);
  

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matchIndex TEXT,
      pointIndex INTEGER,
      server TEXT,
      firstServeDirection TEXT,
      firstServeOutcome TEXT,
      secondServeDirection TEXT,
      secondServeOutcome TEXT,
      rallyLength INTEGER,
      lastShotHand TEXT,
      lastShotType TEXT,
      outcome TEXT,
      outcomeType TEXT,
      winner TEXT,
      notes TEXT,
      tiebreak TEXT,
      pointScore1Pre TEXT,
      pointScore2Pre TEXT,
      gameScore1Pre INTEGER,
      gameScore2Pre INTEGER,
      gameScore1Post INTEGER,
      gameScore2Post INTEGER,
      setScore1Pre INTEGER,
      setScore2Pre INTEGER,
      tiebreakScore1Pre INTEGER,
      tiebreakScore2Pre INTEGER,
      setScore1PreOverride INTEGER,
      setScore2PreOverride INTEGER,
      gameScore1PreOverride INTEGER,
      gameScore2PreOverride INTEGER,
      pointScore1PreOverride TEXT,
      pointScore2PreOverride TEXT,
      tiebreakOverride TEXT,
      tiebreakType TEXT DEFAULT '7',
      timestamp TEXT DEFAULT '',
      setScore1Post INTEGER DEFAULT 0,
      setScore2Post INTEGER DEFAULT 0,
      pointScore1Post TEXT DEFAULT '0',
      pointScore2Post TEXT DEFAULT '0',
      syncStatus TEXT DEFAULT 'pending',
      FOREIGN KEY (matchIndex) REFERENCES matches(matchIndex) ON DELETE CASCADE
    );
  `);

  // Analysis report cache — stores the last-fetched cloud analysis per match
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS analyses_cache (
      matchIndex TEXT PRIMARY KEY,
      analysisJson TEXT NOT NULL,
      cachedAt TEXT NOT NULL
    );
  `);

  // Migrate existing tables
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN gameScore1Post INTEGER;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN gameScore2Post INTEGER;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN setScore1PreOverride INTEGER;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN setScore2PreOverride INTEGER;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN gameScore1PreOverride INTEGER;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN gameScore2PreOverride INTEGER;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN pointScore1PreOverride TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN pointScore2PreOverride TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN tiebreakOverride TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync("ALTER TABLE points ADD COLUMN tiebreakType TEXT DEFAULT '7';");
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync("ALTER TABLE points ADD COLUMN timestamp TEXT DEFAULT '';");
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN setScore1Post INTEGER DEFAULT 0;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE points ADD COLUMN setScore2Post INTEGER DEFAULT 0;');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync("ALTER TABLE points ADD COLUMN pointScore1Post TEXT DEFAULT '0';");
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execAsync("ALTER TABLE points ADD COLUMN pointScore2Post TEXT DEFAULT '0';");
  } catch (e) {
    // Column already exists
  }

  // ── One-time migration: delete cloud-imported data so it re-imports cleanly ──
  // Earlier versions of the app stored raw player name strings (e.g. "S Tsitsipas")
  // in server/winner instead of 'player1'/'player2'. Name-matching fixes are unreliable
  // for players with the same last name. The correct fix is to delete the bad imported
  // data and let importCloudMatch re-run, which compares server/winner against the
  // per-point 'player 1'/'player 2' columns — always an exact match in the source data.
  // Only syncStatus='synced' rows are deleted; locally-charted data ('pending') is kept.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      completedAt TEXT
    );
  `);

  const reimportMigrationDone = await db.getFirstAsync(
    "SELECT 1 FROM migrations WHERE name = 'delete_synced_for_reimport_v1'"
  );
  if (!reimportMigrationDone) {
    try {
      // Delete cloud-imported points and matches (syncStatus = 'synced')
      await db.runAsync("DELETE FROM points WHERE matchIndex IN (SELECT matchIndex FROM matches WHERE syncStatus = 'synced')");
      await db.runAsync("DELETE FROM matches WHERE syncStatus = 'synced'");
      await db.runAsync("DELETE FROM analyses_cache");
      await db.runAsync(
        "INSERT OR REPLACE INTO migrations (name, completedAt) VALUES ('delete_synced_for_reimport_v1', ?)",
        [new Date().toISOString()]
      );
      console.log('[Migration] Cleared synced imports — will re-import from cloud on next sync');
    } catch (err) {
      console.warn('[Migration] delete_synced_for_reimport_v1 failed:', err.message);
    }
  }

  return db;
}

// ==========================================
// MATCHES CRUD OPERATIONS
// ==========================================

export async function createMatch({ matchIndex, user, player1, player2, tournament, date, location, adScoring, notes }) {
  const database = await initializeDb();
  const query = `
    INSERT INTO matches (matchIndex, user, player1, player2, tournament, date, location, adScoring, notes, syncStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `;
  await database.runAsync(query, [
    matchIndex,
    user || '',
    player1 || '',
    player2 || '',
    tournament || '',
    date || '',
    location || '',
    adScoring || 'ad',
    notes || ''
  ]);
  return { matchIndex };
}

export async function getMatches() {
  const database = await initializeDb();
  return await database.getAllAsync('SELECT * FROM matches ORDER BY date DESC, matchIndex DESC');
}

export async function getMatch(matchIndex) {
  const database = await initializeDb();
  return await database.getFirstAsync('SELECT * FROM matches WHERE matchIndex = ?', [matchIndex]);
}

export async function updateMatch({ matchIndex, player1, player2, tournament, date, location, adScoring, notes }) {
  const database = await initializeDb();
  const query = `
    UPDATE matches 
    SET player1 = ?, player2 = ?, tournament = ?, date = ?, location = ?, adScoring = ?, notes = ?, syncStatus = 'pending'
    WHERE matchIndex = ?
  `;
  await database.runAsync(query, [
    player1,
    player2,
    tournament,
    date,
    location,
    adScoring,
    notes,
    matchIndex
  ]);
}

export async function deleteMatch(matchIndex) {
  const database = await initializeDb();
  // Foreign keys ON will cascade delete points
  await database.runAsync('DELETE FROM matches WHERE matchIndex = ?', [matchIndex]);
}

export async function getPendingMatches() {
  const database = await initializeDb();
  return await database.getAllAsync("SELECT * FROM matches WHERE syncStatus = 'pending'");
}

export async function markMatchSynced(matchIndex, lastSyncedTime) {
  const database = await initializeDb();
  await database.runAsync(
    "UPDATE matches SET syncStatus = 'synced', lastSynced = ? WHERE matchIndex = ?",
    [lastSyncedTime, matchIndex]
  );
}

// ==========================================
// POINTS CRUD OPERATIONS
// ==========================================

export async function getPoints(matchIndex) {
  const database = await initializeDb();
  return await database.getAllAsync('SELECT * FROM points WHERE matchIndex = ? ORDER BY pointIndex ASC', [matchIndex]);
}

// ==========================================
// ANALYSIS CACHE
// ==========================================

export async function getAnalysisCache(matchIndex) {
  const database = await initializeDb();
  const row = await database.getFirstAsync(
    'SELECT analysisJson, cachedAt FROM analyses_cache WHERE matchIndex = ?',
    [matchIndex]
  );
  if (!row) return null;
  try {
    return { data: JSON.parse(row.analysisJson), cachedAt: row.cachedAt };
  } catch {
    return null;
  }
}

export async function saveAnalysisCache(matchIndex, analysisData) {
  const database = await initializeDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO analyses_cache (matchIndex, analysisJson, cachedAt) VALUES (?, ?, ?)`,
    [matchIndex, JSON.stringify(analysisData), new Date().toISOString()]
  );
}

export async function clearAnalysisCache(matchIndex) {
  const database = await initializeDb();
  await database.runAsync('DELETE FROM analyses_cache WHERE matchIndex = ?', [matchIndex]);
}

// Overwrite points list for a match
export async function savePoints(matchIndex, pointsList) {
  const database = await initializeDb();
  
  await database.withTransactionAsync(async () => {
    // Delete existing points
    await database.runAsync('DELETE FROM points WHERE matchIndex = ?', [matchIndex]);
    
    // Insert new points
    const insertQuery = `
      INSERT INTO points (
        matchIndex, pointIndex, server, firstServeDirection, firstServeOutcome,
        secondServeDirection, secondServeOutcome, rallyLength, lastShotHand, lastShotType,
        outcome, outcomeType, winner, notes, tiebreak,
        pointScore1Pre, pointScore2Pre, gameScore1Pre, gameScore2Pre,
        gameScore1Post, gameScore2Post,
        setScore1Pre, setScore2Pre, tiebreakScore1Pre, tiebreakScore2Pre,
        setScore1PreOverride, setScore2PreOverride, gameScore1PreOverride, gameScore2PreOverride,
        pointScore1PreOverride, pointScore2PreOverride, tiebreakOverride, tiebreakType,
        timestamp, setScore1Post, setScore2Post, pointScore1Post, pointScore2Post, syncStatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    
    for (let i = 0; i < pointsList.length; i++) {
      const pt = pointsList[i];
      await database.runAsync(insertQuery, [
        matchIndex,
        i, // pointIndex
        pt.server || '',
        pt.firstServeDirection || '',
        pt.firstServeOutcome || '',
        pt.secondServeDirection || '',
        pt.secondServeOutcome || '',
        pt.rallyLength !== undefined ? parseInt(pt.rallyLength) : 0,
        pt.lastShotHand || '',
        pt.lastShotType || '',
        pt.outcome || '',
        pt.outcomeType || '',
        pt.winner || '',
        pt.notes || '',
        pt.tiebreak || 'false',
        pt.pointScore1Pre || '0',
        pt.pointScore2Pre || '0',
        pt.gameScore1Pre !== undefined ? parseInt(pt.gameScore1Pre) : 0,
        pt.gameScore2Pre !== undefined ? parseInt(pt.gameScore2Pre) : 0,
        pt.gameScore1Post !== undefined ? parseInt(pt.gameScore1Post) : 0,
        pt.gameScore2Post !== undefined ? parseInt(pt.gameScore2Post) : 0,
        pt.setScore1Pre !== undefined ? parseInt(pt.setScore1Pre) : 0,
        pt.setScore2Pre !== undefined ? parseInt(pt.setScore2Pre) : 0,
        pt.tiebreakScore1Pre !== undefined ? parseInt(pt.tiebreakScore1Pre) : 0,
        pt.tiebreakScore2Pre !== undefined ? parseInt(pt.tiebreakScore2Pre) : 0,
        pt.setScore1PreOverride !== undefined ? parseInt(pt.setScore1PreOverride) : null,
        pt.setScore2PreOverride !== undefined ? parseInt(pt.setScore2PreOverride) : null,
        pt.gameScore1PreOverride !== undefined ? parseInt(pt.gameScore1PreOverride) : null,
        pt.gameScore2PreOverride !== undefined ? parseInt(pt.gameScore2PreOverride) : null,
        pt.pointScore1PreOverride !== undefined ? pt.pointScore1PreOverride : null,
        pt.pointScore2PreOverride !== undefined ? pt.pointScore2PreOverride : null,
        pt.tiebreakOverride !== undefined ? pt.tiebreakOverride : null,
        pt.tiebreakType || '7',
        pt.timestamp || '',
        pt.setScore1Post !== undefined ? parseInt(pt.setScore1Post) : 0,
        pt.setScore2Post !== undefined ? parseInt(pt.setScore2Post) : 0,
        pt.pointScore1Post || '0',
        pt.pointScore2Post || '0',
      ]);
    }
    
    // Mark match as pending sync since points changed
    await database.runAsync("UPDATE matches SET syncStatus = 'pending' WHERE matchIndex = ?", [matchIndex]);
  });
}

export async function markPointsSynced(matchIndex) {
  const database = await initializeDb();
  await database.runAsync("UPDATE points SET syncStatus = 'synced' WHERE matchIndex = ?", [matchIndex]);
}

// Returns a Set of all matchIndex values currently in local SQLite
export async function getMatchIndexes() {
  const database = await initializeDb();
  const rows = await database.getAllAsync('SELECT matchIndex FROM matches');
  return new Set(rows.map(r => r.matchIndex));
}

// Import a single match (with its points) received from the cloud pull.
// The match and its points are inserted as 'synced' so they won't be re-uploaded.
export async function importCloudMatch(cloudMatch) {
  const database = await initializeDb();
  const matchIndex = String(cloudMatch['match index'] || '');
  const player1    = String(cloudMatch['player1'] || '');
  const player2    = String(cloudMatch['player2'] || '');

  // Insert match metadata
  await database.runAsync(
    `INSERT INTO matches
       (matchIndex, user, player1, player2, tournament, date, location, adScoring, notes, syncStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
    [
      matchIndex,
      String(cloudMatch['user'] || ''),
      player1,
      player2,
      String(cloudMatch['tournament'] || ''),
      String(cloudMatch['date'] || ''),
      '',   // location is not stored in the cloud
      String(cloudMatch['ad scoring'] || 'ad'),
      '',   // notes are not stored in the cloud
    ]
  );

  // Insert points
  const cloudPoints = cloudMatch.points || [];
  if (cloudPoints.length === 0) return;

  await database.withTransactionAsync(async () => {
    for (let i = 0; i < cloudPoints.length; i++) {
      const pt = cloudPoints[i];

      // Use per-point player columns from the points sheet for name lookup — these are
      // guaranteed to be in the same row as server/winner, avoiding mismatches with the
      // analyses sheet's player name that could have subtle whitespace/casing differences.
      const pointPlayer1 = (String(pt['player 1'] || '').trim() || player1.trim());
      const pointPlayer2 = (String(pt['player 2'] || '').trim() || player2.trim());
      const serverName = String(pt['server'] || '').trim();
      const winnerName = String(pt['winner'] || '').trim();

      // Normalize both sides before comparing so minor casing or whitespace differences
      // (e.g. "N Djokovic" vs "Novak Djokovic") don't silently produce wrong player IDs.
      const norm = (s) => String(s || '').trim().toLowerCase();
      const n1 = norm(pointPlayer1);
      const n2 = norm(pointPlayer2);
      const server = norm(serverName) === n1 ? 'player1'
                   : norm(serverName) === n2 ? 'player2'
                   : '';
      const winner = norm(winnerName) === n1 ? 'player1'
                   : norm(winnerName) === n2 ? 'player2'
                   : '';

      // Cloud stores tiebreak as '7-point', '10-point', 'no', or '' — convert back
      const tiebreakVal = String(pt['tiebreak'] || '');
      const tiebreak = (tiebreakVal === '7-point' || tiebreakVal === '10-point') ? 'true' : 'false';
      const tiebreakType = tiebreakVal === '10-point' ? '10' : '7';

      // Reconstruct timestamp from cloud date/time columns
      const cloudDate = String(pt['date'] || '');
      const cloudTime = String(pt['time'] || '');
      let timestamp = '';
      if (cloudDate && cloudTime) {
        const parsed = new Date(`${cloudDate} ${cloudTime}`);
        if (!isNaN(parsed.getTime())) timestamp = parsed.toISOString();
      }

      await database.runAsync(
        `INSERT INTO points (
           matchIndex, pointIndex, server, firstServeDirection, firstServeOutcome,
           secondServeDirection, secondServeOutcome, rallyLength, lastShotHand, lastShotType,
           outcome, outcomeType, winner, notes, tiebreak,
           pointScore1Pre, pointScore2Pre, gameScore1Pre, gameScore2Pre,
           gameScore1Post, gameScore2Post, setScore1Pre, setScore2Pre,
           tiebreakScore1Pre, tiebreakScore2Pre, tiebreakType,
           timestamp, setScore1Post, setScore2Post, pointScore1Post, pointScore2Post, syncStatus
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [
          matchIndex,
          i,
          server,
          String(pt['first serve direction']  || ''),
          String(pt['first serve outcome']     || ''),
          String(pt['second serve direction']  || ''),
          String(pt['second serve outcome']    || ''),
          parseInt(pt['rally length'])         || 0,
          String(pt['last shot hand']          || ''),
          String(pt['last shot type']          || ''),
          String(pt['outcome']                 || ''),
          String(pt['outcome type']            || ''),
          winner,
          '',   // notes not stored in cloud
          tiebreak,
          String(pt['point score 1 pre']       ?? '0'),
          String(pt['point score 2 pre']       ?? '0'),
          parseInt(pt['game score 1 pre'])     || 0,
          parseInt(pt['game score 2 pre'])     || 0,
          parseInt(pt['game score 1 post'])    || 0,
          parseInt(pt['game score 2 post'])    || 0,
          parseInt(pt['set score 1 pre'])      || 0,
          parseInt(pt['set score 2 pre'])      || 0,
          parseInt(pt['tiebreak score 1 pre']) || 0,
          parseInt(pt['tiebreak score 2 pre']) || 0,
          tiebreakType,
          timestamp,
          parseInt(pt['set score 1 post'])     || 0,
          parseInt(pt['set score 2 post'])     || 0,
          String(pt['point score 1 post']      ?? '0'),
          String(pt['point score 2 post']      ?? '0'),
        ]
      );
    }
  });
}
