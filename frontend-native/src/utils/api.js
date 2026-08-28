import { getSettings } from './settings';

async function makeRequest(payload) {
  const { webAppUrl } = await getSettings();
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    throw new Error('Apps Script Web App URL is not configured or invalid.');
  }

  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Server returned HTTP status ${response.status}`);
  }

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse response JSON: ${text.substring(0, 100)}`);
  }

  if (json.status === 'error') {
    throw new Error(json.message || 'Unknown backend error');
  }

  return json.data;
}

export async function syncMatchToCloud(match) {
  // Map our SQLite match keys to the backend's expected JSON format
  // backend expects: matchIndex, user, player1, player2, tournament, date, adScoring
  const payload = {
    action: 'syncMatch',
    match: {
      matchIndex: match.matchIndex,
      user: match.user,
      player1: match.player1,
      player2: match.player2,
      tournament: match.tournament,
      date: match.date,
      adScoring: match.adScoring
    }
  };
  return await makeRequest(payload);
}

export async function syncPointsToCloud(matchIndex, pointsList, player1Name, player2Name, matchUser = '', matchAdScoring = 'ad') {
  // Map SQLite point columns to sheet headers expected by the backend.
  // Spreadsheet column headers (must match exactly):
  // "user", "match index", "server", "first serve direction", "first serve outcome",
  // "second serve direction", "second serve outcome", "rally length", "last shot hand",
  // "last shot type", "outcome", "outcome type", "winner", "ad scoring",
  // "date", "time", "tiebreak",
  // "point score 1 pre", "point score 2 pre", "point score 1 post", "point score 2 post",
  // "game score 1 pre", "game score 2 pre", "game score 1 post", "game score 2 post",
  // "set score 1 pre", "set score 2 pre", "set score 1 post", "set score 2 post",
  // "tiebreak score 1 pre", "tiebreak score 2 pre",
  // "player 1", "player 2"
  
  const mappedPoints = pointsList.map(pt => {
    const ts = pt.timestamp ? new Date(pt.timestamp) : null;
    const dateStr = ts
      ? `${ts.getMonth() + 1}/${ts.getDate()}/${ts.getFullYear()}`
      : '';
    const timeStr = ts
      ? `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}`
      : '';
    return {
      "user":                   pt.user || matchUser || "",
      "match index":            pt.matchIndex,
      "server":                 pt.server === 'player1' ? player1Name : pt.server === 'player2' ? player2Name : (pt.server || ""),
      "first serve direction":  pt.firstServeDirection || "",
      "first serve outcome":    pt.firstServeOutcome || "",
      "second serve direction": pt.secondServeDirection || "",
      "second serve outcome":   pt.secondServeOutcome || "",
      "rally length":           pt.rallyLength !== undefined ? pt.rallyLength : 0,
      "last shot hand":         pt.lastShotHand || "",
      "last shot type":         pt.lastShotType || "",
      "outcome":                pt.outcome || "",
      "outcome type":           pt.outcomeType || "",
      "winner":                 pt.winner === 'player1' ? player1Name : pt.winner === 'player2' ? player2Name : (pt.winner || ""),
      "ad scoring":             pt.adScoring || matchAdScoring || "ad",
      "date":                   dateStr,
      "time":                   timeStr,
      "tiebreak":               pt.tiebreak === 'true' ? (pt.tiebreakType === '10' ? '10-point' : '7-point') : 'no',
      "point score 1 pre":      pt.pointScore1Pre || "0",
      "point score 2 pre":      pt.pointScore2Pre || "0",
      "point score 1 post":     pt.pointScore1Post || "0",
      "point score 2 post":     pt.pointScore2Post || "0",
      "game score 1 pre":       pt.gameScore1Pre !== undefined ? pt.gameScore1Pre : 0,
      "game score 2 pre":       pt.gameScore2Pre !== undefined ? pt.gameScore2Pre : 0,
      "game score 1 post":      pt.gameScore1Post !== undefined ? pt.gameScore1Post : 0,
      "game score 2 post":      pt.gameScore2Post !== undefined ? pt.gameScore2Post : 0,
      "set score 1 pre":        pt.setScore1Pre !== undefined ? pt.setScore1Pre : 0,
      "set score 2 pre":        pt.setScore2Pre !== undefined ? pt.setScore2Pre : 0,
      "set score 1 post":       pt.setScore1Post !== undefined ? pt.setScore1Post : 0,
      "set score 2 post":       pt.setScore2Post !== undefined ? pt.setScore2Post : 0,
      "tiebreak score 1 pre":   pt.tiebreakScore1Pre !== undefined ? pt.tiebreakScore1Pre : 0,
      "tiebreak score 2 pre":   pt.tiebreakScore2Pre !== undefined ? pt.tiebreakScore2Pre : 0,
      "player 1":               player1Name,
      "player 2":               player2Name,
    };
  });

  const payload = {
    action: 'syncPoints',
    matchIndex,
    points: mappedPoints
  };
  return await makeRequest(payload);
}

export async function deleteMatchFromCloud(matchIndex) {
  const payload = {
    action: 'deleteMatch',
    matchIndex
  };
  return await makeRequest(payload);
}

export async function fetchAnalysisFromCloud(matchIndex) {
  const payload = {
    action: 'getAnalysis',
    matchIndex
  };
  return await makeRequest(payload);
}

// Fetch structured insights for one or more matches from a chosen player's side.
// mode is resolved on-device (Deterministic/LLM/Hybrid), so it isn't sent here —
// the backend always returns the same structured JSON.
export async function fetchInsightsFromCloud(matchIndexes, side) {
  const payload = {
    action: 'getInsights',
    matchIndexes,
    side: side || 'player1',
  };
  return await makeRequest(payload);
}

export async function fetchMatchesFromCloud(userId) {
  const payload = {
    action: 'getMatchesByUser',
    userId
  };
  return await makeRequest(payload);
}
