/**
 * Tennis Score Calculator Engine
 * Calculates the running score of a match point-by-point.
 * 
 * Rules supported:
 * - Ad / No-Ad scoring formats
 * - Tiebreak: 7-point (first to 7 by 2) or 10-point super tiebreak (first to 10 by 2)
 * - Set winner: first to 6 games by 2 (or 7-5, or tiebreak winner 7-6)
 * - Alternating servers every game
 * - Tiebreak serving rotation: server A (1 pt), server B (2 pts), server A (2 pts), etc.
 */

const POINT_SCORES = ['0', '15', '30', '40', 'ad'];

export function calculateScores(pointsList, firstGameServer = 'player1', adScoring = 'ad') {
  // Deep copy the points array to avoid mutating inputs
  const points = pointsList.map((p, idx) => ({
    ...p,
    pointIndex: idx
  }));

  if (points.length === 0) return [];

  // Determine first server from the first point in the list if available, fallback to the parameter
  const actualFirstServer = (pointsList && pointsList[0] && (pointsList[0].server === 'player1' || pointsList[0].server === 'player2'))
    ? pointsList[0].server
    : firstGameServer;

  // Running match states
  let currentSetScore1 = 0;
  let currentSetScore2 = 0;
  
  let currentGameScore1 = 0;
  let currentGameScore2 = 0;
  
  let currentPointScore1Idx = 0; // index in POINT_SCORES (0, 1, 2, 3, 4)
  let currentPointScore2Idx = 0;
  
  let currentTiebreakScore1 = 0;
  let currentTiebreakScore2 = 0;
  
  let inTiebreak = false;
  let matchEnded = false;
  // Use 3 sets to win (covers best-of-5, the maximum in any tennis format).
  // For best-of-3 matches, matchEnded never triggers here; the display layer
  // handles matchOver detection for those via set score checks.
  const setsToWin = 3;

  // Track servers
  let gameServer = actualFirstServer; // server of the current game
  let tiebreakServer = actualFirstServer; // server of the current point in tiebreak
  let tiebreakPointCount = 0; // count points in the current tiebreak to alternate server
  let firstTiebreakServer = actualFirstServer; // to determine who serves next set

  for (let idx = 0; idx < points.length; idx++) {
    const pt = points[idx];

    // Once match has ended, stamp frozen final state on remaining points
    // (including the dummy point used for current-score display) so they
    // have valid score properties instead of undefined.
    if (matchEnded) {
      pt.setScore1Pre = currentSetScore1;
      pt.setScore2Pre = currentSetScore2;
      pt.gameScore1Pre = currentGameScore1;
      pt.gameScore2Pre = currentGameScore2;
      pt.tiebreak = 'false';
      pt.tiebreakScore1Pre = 0;
      pt.tiebreakScore2Pre = 0;
      pt.pointScore1Pre = '0';
      pt.pointScore2Pre = '0';
      pt.server = gameServer;
      pt.gameScore1Post = currentGameScore1;
      pt.gameScore2Post = currentGameScore2;
      pt.setScore1Post = currentSetScore1;
      pt.setScore2Post = currentSetScore2;
      pt.pointScore1Post = '0';
      pt.pointScore2Post = '0';
      pt.matchEnded = true;
      continue;
    }

    // If the user manually selected/overrode a server for this point,
    // update our running simulator's server to match their manual choice.
    if (pt.server && (pt.server === 'player1' || pt.server === 'player2')) {
      if (inTiebreak) {
        if (tiebreakServer !== pt.server) {
          tiebreakServer = pt.server;
        }
      } else {
        if (gameServer !== pt.server) {
          gameServer = pt.server;
        }
      }
    }

    // Apply manual score overrides if present in this point
    if (pt.setScore1PreOverride !== undefined && pt.setScore1PreOverride !== null) {
      currentSetScore1 = pt.setScore1PreOverride;
    }
    if (pt.setScore2PreOverride !== undefined && pt.setScore2PreOverride !== null) {
      currentSetScore2 = pt.setScore2PreOverride;
    }
    if (pt.gameScore1PreOverride !== undefined && pt.gameScore1PreOverride !== null) {
      currentGameScore1 = pt.gameScore1PreOverride;
    }
    if (pt.gameScore2PreOverride !== undefined && pt.gameScore2PreOverride !== null) {
      currentGameScore2 = pt.gameScore2PreOverride;
    }
    if (pt.tiebreakOverride !== undefined && pt.tiebreakOverride !== null) {
      inTiebreak = pt.tiebreakOverride === 'true';
    }
    if (pt.pointScore1PreOverride !== undefined && pt.pointScore1PreOverride !== null) {
      if (inTiebreak) {
        currentTiebreakScore1 = parseInt(pt.pointScore1PreOverride) || 0;
      } else {
        currentPointScore1Idx = POINT_SCORES.indexOf(pt.pointScore1PreOverride);
        if (currentPointScore1Idx === -1) currentPointScore1Idx = 0;
      }
    }
    if (pt.pointScore2PreOverride !== undefined && pt.pointScore2PreOverride !== null) {
      if (inTiebreak) {
        currentTiebreakScore2 = parseInt(pt.pointScore2PreOverride) || 0;
      } else {
        currentPointScore2Idx = POINT_SCORES.indexOf(pt.pointScore2PreOverride);
        if (currentPointScore2Idx === -1) currentPointScore2Idx = 0;
      }
    }

    // 1. Record pre-point scores
    pt.setScore1Pre = currentSetScore1;
    pt.setScore2Pre = currentSetScore2;
    pt.gameScore1Pre = currentGameScore1;
    pt.gameScore2Pre = currentGameScore2;
    
    pt.tiebreak = inTiebreak ? 'true' : 'false';

    let gameScore1PostVal = currentGameScore1;
    let gameScore2PostVal = currentGameScore2;

    if (inTiebreak) {
      pt.tiebreakScore1Pre = currentTiebreakScore1;
      pt.tiebreakScore2Pre = currentTiebreakScore2;
      pt.pointScore1Pre = currentTiebreakScore1.toString();
      pt.pointScore2Pre = currentTiebreakScore2.toString();
      
      // Determine server during tiebreak:
      // Point 1: Player A serves (1 point total)
      // Points 2 & 3: Player B serves (2 points total)
      // Points 4 & 5: Player A serves (2 points total)
      // Alternates every 2 points after the first point.
      if (tiebreakPointCount === 0) {
        tiebreakServer = gameServer;
      } else {
        const rotationIdx = Math.floor((tiebreakPointCount - 1) / 2);
        if (rotationIdx % 2 === 0) {
          // Player B serves
          tiebreakServer = gameServer === 'player1' ? 'player2' : 'player1';
        } else {
          // Player A serves
          tiebreakServer = gameServer;
        }
      }
      pt.server = tiebreakServer;
    } else {
      pt.tiebreakScore1Pre = 0;
      pt.tiebreakScore2Pre = 0;
      pt.pointScore1Pre = POINT_SCORES[currentPointScore1Idx];
      pt.pointScore2Pre = POINT_SCORES[currentPointScore2Idx];
      pt.server = gameServer;
    }

    // 2. Process point winner
    const winner = pt.winner;
    
    if (inTiebreak) {
      if (winner === 'player1') {
        currentTiebreakScore1++;
      } else {
        currentTiebreakScore2++;
      }
      tiebreakPointCount++;

      // Determine tiebreak win threshold from the point's tiebreakType field
      const tiebreakThreshold = (pt.tiebreakType === '10') ? 10 : 7;

      // Check if tiebreak is won (first to threshold points by a margin of 2)
      if (currentTiebreakScore1 >= tiebreakThreshold && (currentTiebreakScore1 - currentTiebreakScore2) >= 2) {
        // Player 1 wins tiebreak, game and set
        gameScore1PostVal = 7;
        gameScore2PostVal = 6;
        currentSetScore1++;
        
        // Reset game and tiebreak scores
        currentGameScore1 = 0;
        currentGameScore2 = 0;
        currentPointScore1Idx = 0;
        currentPointScore2Idx = 0;
        currentTiebreakScore1 = 0;
        currentTiebreakScore2 = 0;
        inTiebreak = false;
        if (currentSetScore1 >= setsToWin) matchEnded = true;
        
        // Alternate server for next set: player who received first point of tiebreak
        gameServer = firstTiebreakServer === 'player1' ? 'player2' : 'player1';
      } else if (currentTiebreakScore2 >= tiebreakThreshold && (currentTiebreakScore2 - currentTiebreakScore1) >= 2) {
        // Player 2 wins tiebreak, game and set
        gameScore1PostVal = 6;
        gameScore2PostVal = 7;
        currentSetScore2++;
        
        currentGameScore1 = 0;
        currentGameScore2 = 0;
        currentPointScore1Idx = 0;
        currentPointScore2Idx = 0;
        currentTiebreakScore1 = 0;
        currentTiebreakScore2 = 0;
        inTiebreak = false;
        if (currentSetScore2 >= setsToWin) matchEnded = true;
        
        gameServer = firstTiebreakServer === 'player1' ? 'player2' : 'player1';
      } else {
        // Tiebreak still ongoing
        gameScore1PostVal = 6;
        gameScore2PostVal = 6;
      }
    } else {
      // Normal Game Point Progression
      if (winner === 'player1') {
        if (currentPointScore1Idx === 3) { // 40
          if (currentPointScore2Idx === 4) { // ad-40 for player 2 -> back to Deuce
            currentPointScore2Idx = 3;
          } else if (currentPointScore2Idx === 3 && adScoring === 'ad') { // 40-40 -> ad-40 for player 1
            currentPointScore1Idx = 4;
          } else { // Wins game
            currentGameScore1++;
            gameScore1PostVal = currentGameScore1;
            // Reset point scores
            currentPointScore1Idx = 0;
            currentPointScore2Idx = 0;
            // Alternate server for next game
            gameServer = gameServer === 'player1' ? 'player2' : 'player1';
          }
        } else if (currentPointScore1Idx === 4) { // ad-40 -> Wins game
          currentGameScore1++;
          gameScore1PostVal = currentGameScore1;
          currentPointScore1Idx = 0;
          currentPointScore2Idx = 0;
          gameServer = gameServer === 'player1' ? 'player2' : 'player1';
        } else {
          currentPointScore1Idx++;
        }
      } else { // Winner is player 2
        if (currentPointScore2Idx === 3) { // 40
          if (currentPointScore1Idx === 4) { // ad-40 for player 1 -> back to Deuce
            currentPointScore1Idx = 3;
          } else if (currentPointScore1Idx === 3 && adScoring === 'ad') { // 40-40 -> 40-ad for player 2
            currentPointScore2Idx = 4;
          } else { // Wins game
            currentGameScore2++;
            gameScore2PostVal = currentGameScore2;
            currentPointScore1Idx = 0;
            currentPointScore2Idx = 0;
            gameServer = gameServer === 'player1' ? 'player2' : 'player1';
          }
        } else if (currentPointScore2Idx === 4) { // 40-ad -> Wins game
          currentGameScore2++;
          gameScore2PostVal = currentGameScore2;
          currentPointScore1Idx = 0;
          currentPointScore2Idx = 0;
          gameServer = gameServer === 'player1' ? 'player2' : 'player1';
        } else {
          currentPointScore2Idx++;
        }
      }

      // Check if set is won
      // First to 6 games by margin of 2, or 7-5.
      if (currentGameScore1 >= 6 && (currentGameScore1 - currentGameScore2) >= 2) {
        currentSetScore1++;
        currentGameScore1 = 0;
        currentGameScore2 = 0;
        if (currentSetScore1 >= setsToWin) matchEnded = true;
      } else if (currentGameScore2 >= 6 && (currentGameScore2 - currentGameScore1) >= 2) {
        currentSetScore2++;
        currentGameScore1 = 0;
        currentGameScore2 = 0;
        if (currentSetScore2 >= setsToWin) matchEnded = true;
      } else if (currentGameScore1 === 6 && currentGameScore2 === 6) {
        // Play tiebreak
        inTiebreak = true;
        currentTiebreakScore1 = 0;
        currentTiebreakScore2 = 0;
        tiebreakPointCount = 0;
        firstTiebreakServer = gameServer;
      }
    }

    pt.gameScore1Post = gameScore1PostVal;
    pt.gameScore2Post = gameScore2PostVal;

    // Post-point scores — state after this point's effects are fully applied
    pt.setScore1Post = currentSetScore1;
    pt.setScore2Post = currentSetScore2;
    if (inTiebreak) {
      pt.pointScore1Post = currentTiebreakScore1.toString();
      pt.pointScore2Post = currentTiebreakScore2.toString();
    } else {
      pt.pointScore1Post = POINT_SCORES[currentPointScore1Idx];
      pt.pointScore2Post = POINT_SCORES[currentPointScore2Idx];
    }
  }

  return points;
}
