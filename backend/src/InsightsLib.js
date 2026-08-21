/**
 * InsightsLib.js — pure, Apps-Script-free insights engine.
 *
 * Reads NORMALIZED point rows (where "player 1" == "subject" and "player 2" ==
 * "opponent", and `server`/`winner` have been remapped to "subject"/"opponent")
 * and produces a structured JSON object answering the 8 report questions.
 *
 * Pure = no SpreadsheetApp / no column-index globals. Runs in Node against the
 * test xlsx and in Apps Script (loaded into the same global scope as
 * MicroStats.js). At the bottom, `module.exports` is guarded so Node can
 * require() it while Apps Script ignores it.
 *
 * Field keys are the spreadsheet header strings (lowercase), matching the
 * `points` sheet and the JSON the app syncs:
 *   "server","winner","player 1","player 2",
 *   "first serve direction","first serve outcome",
 *   "second serve direction","second serve outcome",
 *   "rally length","last shot hand","last shot type",
 *   "outcome","outcome type",
 *   "point score 1 pre","point score 2 pre",
 *   "tiebreak","tiebreak score 1 pre","tiebreak score 2 pre",
 *   "game score 1 pre","game score 2 pre",
 *   "game score 1 post","game score 2 post",
 *   "set score 1 pre","set score 2 pre","set score 1 post","set score 2 post",
 *   "ad scoring","match index","date","time"
 *
 * After normalization, player1 === 'subject' so all the original helpers'
 * "server == player1" checks become "server == 'subject'".
 */

// ─── Sample-size thresholds ─────────────────────────────────────────────────
// Below these, a conclusion is suppressed (sufficient:false) and the report
// shows "Insufficient data (n=…)" instead of guessing. Satisfies the user's
// "if there is not enough data, do not make a conclusion" rule.
var THRESHOLDS = {
  serveDirection: 6,     // serves in a scenario to name a dominant direction
  servePct: 4,           // serves to state a make/won %
  shotStrength: 10,      // relevant shots to call a baseline/net strength/weakness
  timeSeriesBucket: 8,   // points in a 4-game bucket to comment on it
  highPressure: 6,       // high-pressure points for a clutch claim
  breakGamePoint: 4,     // break/game points to state a conversion %
};

// ─── Pure helpers (rewritten from MicroStats.js for object-keyed rows) ──────

// Return: 0 (unknown), 1 (deuce side), 2 (ad side)
function getServeSide(row) {
  var isTb = row['tiebreak'] === '7-point' || row['tiebreak'] === '10-point';
  if (!isTb) {
    var score = String(row['point score 1 pre']) + '-' + String(row['point score 2 pre']);
    switch (score) {
      case '0-0': case '15-15': case '0-30': case '30-0': case '30-30':
      case '40-15': case '15-40': case '40-40':
        return 1;
      case '0-15': case '15-0': case '30-15': case '15-30': case '0-40':
      case '40-0': case '40-30': case '30-40': case '40-ad': case 'ad-40':
        return 2;
      default:
        return 0;
    }
  } else {
    var sum = Number(row['tiebreak score 1 pre']) + Number(row['tiebreak score 2 pre']);
    return (sum % 2 === 0) ? 1 : 2;
  }
}

// Return: -2 (opponent break point), -1 (subject break point), 0 (not g/b point),
// 1 (subject game point), 2 (opponent game point),
// 3 (40-40 no-ad, subject serving), 4 (40-40 no-ad, opponent serving)
function isGameOrBreakPoint(row) {
  var tiebreak = false;
  var tiebreakDeuceThreshold = 0;
  if (row['tiebreak'] === '7-point') { tiebreak = true; tiebreakDeuceThreshold = 6; }
  else if (row['tiebreak'] === '10-point') { tiebreak = true; tiebreakDeuceThreshold = 9; }

  var server = row['server'];
  var p1tb = Number(row['tiebreak score 1 pre']);
  var p2tb = Number(row['tiebreak score 2 pre']);
  var ps1 = String(row['point score 1 pre']);
  var ps2 = String(row['point score 2 pre']);
  var adScoring = row['ad scoring'];

  if (tiebreak) {
    if ((p1tb >= tiebreakDeuceThreshold) && (p1tb > p2tb)) {
      if (server === 'subject') return 1;
      if (server === 'opponent') return -1;
    } else if ((p2tb >= tiebreakDeuceThreshold) && (p2tb > p1tb)) {
      if (server === 'opponent') return 2;
      if (server === 'subject') return -2;
    }
  } else {
    var p1OneFromGame = ((ps1 === '40') && (ps2 !== '40') && (ps2 !== 'ad')) || (ps1 === 'ad');
    var p2OneFromGame = ((ps2 === '40') && (ps1 !== '40') && (ps1 !== 'ad')) || (ps2 === 'ad');
    if (p1OneFromGame) {
      if (server === 'subject') return 1;
      if (server === 'opponent') return -1;
    } else if (p2OneFromGame) {
      if (server === 'opponent') return 2;
      if (server === 'subject') return -2;
    } else if ((adScoring === 'no-ad') && (ps1 === '40') && (ps2 === '40')) {
      if (server === 'subject') return 3;
      if (server === 'opponent') return 4;
    }
  }
  return 0;
}

// Return: 0 (not high pressure), 1 (subject's), 2 (opponent's), 3 (both)
function isHighPressurePoint(row) {
  if (isGameOrBreakPoint(row) !== 0) return 3;

  var isTiebreak = false;
  var tbPressureScore = 0;
  if (row['tiebreak'] === '7-point') { isTiebreak = true; tbPressureScore = 5; }
  else if (row['tiebreak'] === '10-point') { isTiebreak = true; tbPressureScore = 8; }

  if (isTiebreak) {
    var result = 0;
    if (Number(row['tiebreak score 2 pre']) >= tbPressureScore) result += 1;
    if (Number(row['tiebreak score 1 pre']) >= tbPressureScore) result += 2;
    return result;
  } else {
    var highPressureScores = ['30', '40', 'ad'];
    var result = 0;
    if (highPressureScores.indexOf(String(row['point score 2 pre'])) !== -1) result += 1;
    if (highPressureScores.indexOf(String(row['point score 1 pre'])) !== -1) result += 2;
    return result;
  }
}

// ─── Small stat helpers ──────────────────────────────────────────────────────
function pct(num, den) {
  if (!den) return null;
  return Math.round((num / den) * 100);
}
function pctObj(num, den, threshold) {
  var n = num || 0;
  var d = den || 0;
  return {
    value: d > 0 ? Math.round((n / d) * 100) : null,
    n: n, d: d,
    sufficient: d >= (threshold || THRESHOLDS.servePct)
  };
}
// Direction distribution: {wide,body,t} counts -> structured with % and dominant
function dirDist(w, b, t, threshold) {
  var n = (w || 0) + (b || 0) + (t || 0);
  var th = threshold || THRESHOLDS.serveDirection;
  var dist = { wide: w || 0, body: b || 0, t: t || 0, n: n, sufficient: n >= th };
  if (n >= th) {
    var entries = [['wide', w || 0], ['body', b || 0], ['t', t || 0]];
    entries.sort(function (a, c) { return c[1] - a[1]; });
    dist.dominant = entries[0][1] > 0 ? entries[0][0] : null;
    dist.dominantPct = entries[0][1] > 0 ? Math.round((entries[0][1] / n) * 100) : null;
    dist.widePct = w ? Math.round((w / n) * 100) : 0;
    dist.bodyPct = b ? Math.round((b / n) * 100) : 0;
    dist.tPct = t ? Math.round((t / n) * 100) : 0;
  }
  return dist;
}

// ─── Main entry ──────────────────────────────────────────────────────────────
function computeInsights(rows, subjectName, opponentName) {
  // rows: normalized point objects (server/winner in {'subject','opponent',''}).
  // subjectName/opponentName: for display/labels (may be '' in pure-test mode).

  // Counters
  var serve = {
    // first-serve direction tallies (subject's serves), by scenario
    firstAll: { w: 0, b: 0, t: 0 },
    firstDeuce: { w: 0, b: 0, t: 0 },
    firstAd: { w: 0, b: 0, t: 0 },
    secondAll: { w: 0, b: 0, t: 0 },
    secondDeuce: { w: 0, b: 0, t: 0 },
    secondAd: { w: 0, b: 0, t: 0 },
    firstHP: { w: 0, b: 0, t: 0 },     // high-pressure, subject serving
    secondHP: { w: 0, b: 0, t: 0 },
    firstGP: { w: 0, b: 0, t: 0 },     // game-point, subject serving
    secondGP: { w: 0, b: 0, t: 0 },
    // sequence strings (W/B/T per point) for readability
    seqFirstDeuce: '', seqFirstAd: '', seqSecondDeuce: '', seqSecondAd: '',
    // make / won
    firstAttempts: 0, firstIn: 0, firstWon: 0,
    secondServes: 0, secondWon: 0,
    firstInDeuce: 0, firstInAd: 0, firstDeuceAttempts: 0, firstAdAttempts: 0,
    aces: 0, doubleFaults: 0,
    faultNet: 0, faultOut: 0,
    unreturnable: 0,
  };

  var baseline = {
    ueTotal: 0, ueForehand: 0, ueBackhand: 0, ueSlice: 0, ueVolley: 0,
    ueOverhead: 0, ueDropshot: 0, ueLob: 0, uePassing: 0,
    ueNet: 0, ueOut: 0,
    winTotal: 0, winForehand: 0, winBackhand: 0, winSlice: 0, winVolley: 0,
    winOverhead: 0, winDropshot: 0, winLob: 0, winPassing: 0,
  };

  var net = {
    // net points = any point ending in volley/overhead by either player, or
    // passing/lob touches (mirrors engine's netPointCount derivation)
    played: 0, won: 0,
    volleyWon: 0, volleyUE: 0,
    overheadWon: 0, overheadUE: 0,
  };

  var pressure = {
    hpServed: 0, hpWon: 0, hpLost: 0,
    hpFirstIn: 0,      // subject's first serves made under high pressure
    hpUE: 0,           // unforced errors made by subject under pressure (when subject lost)
    hpWonByOpponentUE: 0, // subject won because opponent errored under pressure
    hpOnServe: 0, hpOnReturn: 0,
    // game/break points (subject's)
    gamePointCreated: 0, gamePointWon: 0,
    breakPointCreated: 0, breakPointWon: 0,
  };

  var overall = {
    pointsWon: 0, pointsLost: 0, rallySum: 0, rallyCount: 0, longestRally: 0,
    shortWon: 0, shortLost: 0, medWon: 0, medLost: 0, longWon: 0, longLost: 0,
    returnWinner: 0, returnUE: 0, // subject's return performance
  };

  // Time-series: buckets every 4 games within a set, mirroring the engine.
  var ts = {
    buckets: [], // each: {winners, unforcedErrors, aces, doubleFaults, pointsWon, pointsLost, n, isSetMarker:false}
  };
  function pushBucket() {
    ts.buckets.push({ winners: 0, unforcedErrors: 0, aces: 0, doubleFaults: 0,
      pointsWon: 0, pointsLost: 0, n: 0, isSetMarker: false, label: '' });
  }
  function curBucket() { return ts.buckets[ts.buckets.length - 1]; }
  function pushSetMarker() {
    ts.buckets.push({ winners: 0, unforcedErrors: 0, aces: 0, doubleFaults: 0,
      pointsWon: 0, pointsLost: 0, n: 0, isSetMarker: true, label: 'set' });
    pushBucket(); // fresh bucket after the marker
  }

  // Set/game tracking (mirrors engine's newGame/newSet/gameCount logic)
  var newGame = true, newSet = true, gameCount = 0;
  var prevMatch = null;
  pushBucket(); // first bucket

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var server = r['server'];
    var winner = r['winner'];
    var subjectServing = (server === 'subject');
    var subjectWon = (winner === 'subject');

    // ── game/set/match transition detection (for bucketing) ──
    if (i > 0) {
      var prev = rows[i - 1];
      if (String(r['match index']) !== String(prev['match index'])) {
        // match boundary — treat like a set boundary
        newSet = true; newGame = true;
      } else {
        if ((r['game score 1 pre'] != prev['game score 1 pre']) ||
            (r['game score 2 pre'] != prev['game score 2 pre'])) {
          newGame = true;
        } else { newGame = false; }
        if ((r['set score 1 pre'] != prev['set score 1 pre']) ||
            (r['set score 2 pre'] != prev['set score 2 pre'])) {
          newSet = true;
        } else { newSet = false; }
      }
    }

    // End-of-set detection (engine's isEndOfSet logic)
    var g1post = Number(r['game score 1 post']);
    var g2post = Number(r['game score 2 post']);
    var g1pre = Number(r['game score 1 pre']);
    var g2pre = Number(r['game score 2 pre']);
    var isEndOfSet = false;
    if (g1post !== g1pre || g2post !== g2pre) {
      if (g1post === 7 || g2post === 7) { isEndOfSet = true; }
      else if ((g1post === 6 || g2post === 6) && ((g1post + g2post) < 11)) { isEndOfSet = true; }
    }
    gameCount = g1pre + g2pre + 1;

    // Bucket every 4 games (engine: newSet || (newGame && gameCount%4==1))
    if (newSet || (newGame && (gameCount % 4) === 1)) {
      pushBucket();
    }

    var side = getServeSide(r); // 1 deuce, 2 ad, 0 unknown

    // Pressure flags (needed for high-pressure / game-point serve tallies)
    var hp = isHighPressurePoint(r);   // 1 or 3 => subject's high-pressure point
    var gbp = isGameOrBreakPoint(r);   // 1 or 3 => subject's game point
    var subjectHighPressure = (hp === 1 || hp === 3);
    var subjectGamePoint = (gbp === 1 || gbp === 3);

    // ── Serve direction counting (subject's serves) ──
    if (subjectServing) {
      serve.firstAttempts++;
      if (side === 1) serve.firstDeuceAttempts++;
      else if (side === 2) serve.firstAdAttempts++;

      var fdir = r['first serve direction'];
      var fout = r['first serve outcome'];
      var sdir = r['second serve direction'];
      var sout = r['second serve outcome'];

      var firstIn = (fout === 'in' || fout === 'ace');
      if (firstIn) {
        serve.firstIn++;
        if (side === 1) serve.firstInDeuce++;
        else if (side === 2) serve.firstInAd++;
        if (subjectWon) serve.firstWon++;
      } else {
        // first serve faulted -> this becomes a second serve
        serve.secondServes++;
        if (fout === 'net') serve.faultNet++;
        else if (fout === 'out') serve.faultOut++;
        // second-serve win = subject won the point after a first-serve fault,
        // regardless of whether a second-serve direction was recorded.
        if (subjectWon) serve.secondWon++;
      }

      // High-pressure first-serve make tracking (for Q6)
      if (subjectHighPressure && firstIn) pressure.hpFirstIn++;

      // direction of first serve (all attempts, in or fault — mirrors engine)
      if (fdir === 'wide' || fdir === 'body' || fdir === 't') {
        var key = fdir === 'wide' ? 'w' : fdir === 'body' ? 'b' : 't';
        serve.firstAll[key]++;
        if (side === 1) serve.firstDeuce[key]++;
        else if (side === 2) serve.firstAd[key]++;
        serve.seqFirstDeuce += (side === 1 ? letterFor(fdir) : '');
        serve.seqFirstAd += (side === 2 ? letterFor(fdir) : '');
        if (subjectHighPressure) serve.firstHP[key]++;
        if (subjectGamePoint) serve.firstGP[key]++;
      }
      // direction of second serve (only when first faulted)
      if (!firstIn && (sdir === 'wide' || sdir === 'body' || sdir === 't')) {
        var skey = sdir === 'wide' ? 'w' : sdir === 'body' ? 'b' : 't';
        serve.secondAll[skey]++;
        if (side === 1) serve.secondDeuce[skey]++;
        else if (side === 2) serve.secondAd[skey]++;
        serve.seqSecondDeuce += (side === 1 ? letterFor(sdir) : '');
        serve.seqSecondAd += (side === 2 ? letterFor(sdir) : '');
        if (subjectHighPressure) serve.secondHP[skey]++;
        if (subjectGamePoint) serve.secondGP[skey]++;
      }

      // aces / double faults / unreturnable
      if (fout === 'ace' || sout === 'ace') {
        serve.aces++;
      }
      if (((fout === 'out') || (fout === 'net')) && ((sout === 'out') || (sout === 'net'))) {
        serve.doubleFaults++;
      }
    }

    // Unreturnable serve (subject hit a serve the opponent couldn't return = winner with lastShotType 'serve')
    if (subjectWon && r['last shot type'] === 'serve') {
      serve.unreturnable++;
    }

    // ── Baseline: unforced errors & winners by shot (subject) ──
    // Subject's unforced errors = subject made UE => winner == opponent
    if (!subjectWon && r['outcome type'] === 'unforced error') {
      baseline.ueTotal++;
      if (r['outcome'] === 'net') baseline.ueNet++;
      else if (r['outcome'] === 'out') baseline.ueOut++;
      classifyShot(baseline, r, 'ue');
    }
    // Subject's winners & forced errors = subject won via winner/forced error
    if (subjectWon && (r['outcome type'] === 'winner' || r['outcome type'] === 'forced error')) {
      if (r['last shot type'] !== 'serve') { // don't count unreturnable serves as winners here
        baseline.winTotal++;
        classifyShot(baseline, r, 'win');
      }
    }

    // ── Net game ──
    // A net point is any point whose last shot was volley/overhead (by either),
    // or passing/lob (engine's netPointCount derivation). Volley/overhead
    // won/UE counts are derived in buildReport from the baseline counters
    // (classifyShot already tallied them) to avoid double counting.
    var lst = r['last shot type'];
    if (lst === 'volley' || lst === 'overhead' || lst === 'passing' || lst === 'lob') {
      net.played++;
      if (subjectWon) net.won++;
    }

    // ── Overall points / rally ──
    if (subjectWon) overall.pointsWon++; else overall.pointsLost++;
    var rl = Number(r['rally length']);
    if (!isNaN(rl) && rl > 0) {
      overall.rallySum += rl;
      overall.rallyCount++;
      if (rl > overall.longestRally) overall.longestRally = rl;
      if (rl <= 5) { subjectWon ? overall.shortWon++ : overall.shortLost++; }
      else if (rl <= 9) { subjectWon ? overall.medWon++ : overall.medLost++; }
      else { subjectWon ? overall.longWon++ : overall.longLost++; }
    }

    // ── Return performance (subject is returner = opponent serving) ──
    if (!subjectServing) {
      if (rl === 2 && r['outcome type'] === 'winner') overall.returnWinner++;
      if (rl === 2 && r['outcome type'] === 'unforced error') overall.returnUE++;
      if (rl === 3 && r['outcome type'] === 'forced error') overall.returnWinner++; // return forced serve error
    }

    // ── High-pressure points (subject's) ──
    var hp = isHighPressurePoint(r);
    if (hp === 1 || hp === 3) {
      // subject's high-pressure point
      if (subjectServing) {
        pressure.hpServed++;
        pressure.hpOnServe++;
      } else {
        pressure.hpOnReturn++;
      }
      if (subjectWon) {
        pressure.hpWon++;
        pressure.hpWonByOpponentUE += (r['outcome type'] === 'unforced error') ? 1 : 0;
      } else {
        pressure.hpLost++;
        pressure.hpUE += (r['outcome type'] === 'unforced error') ? 1 : 0;
      }
    }

    // ── Game / break points (subject's) ──
    var gbp = isGameOrBreakPoint(r);
    if (gbp === 1 || gbp === 3) { pressure.gamePointCreated++; if (subjectWon) pressure.gamePointWon++; }
    if (gbp === -1 || gbp === 4) { pressure.breakPointCreated++; if (subjectWon) pressure.breakPointWon++; }

    // ── Time-series bucket accumulation ──
    if (curBucket() && !curBucket().isSetMarker) {
      var b = curBucket();
      b.n++;
      if (subjectWon) b.pointsWon++; else b.pointsLost++;
      if (r['outcome type'] === 'unforced error' && !subjectWon) b.unforcedErrors++; // subject UE
      if (subjectWon && (r['outcome type'] === 'winner' || r['outcome type'] === 'forced error')) b.winners++;
      if (subjectServing && (r['first serve outcome'] === 'ace' || r['second serve outcome'] === 'ace')) b.aces++;
      if (subjectServing && ((r['first serve outcome'] === 'out' || r['first serve outcome'] === 'net') &&
          (r['second serve outcome'] === 'out' || r['second serve outcome'] === 'net'))) b.doubleFaults++;
    }

    if (isEndOfSet) {
      pushSetMarker();
    }
  }

  // ── Assemble structured output ──
  return buildReport(rows, serve, baseline, net, pressure, overall, ts,
    subjectName, opponentName);
}

function letterFor(dir) {
  return dir === 'wide' ? 'W' : dir === 'body' ? 'B' : dir === 't' ? 'T' : '';
}

// Increment the right shot counter for unforced errors ('ue') or winners ('win')
function classifyShot(baseline, r, kind) {
  var type = r['last shot type'];
  var hand = r['last shot hand'];
  var map = {
    volley: kind === 'ue' ? 'ueVolley' : 'winVolley',
    overhead: kind === 'ue' ? 'ueOverhead' : 'winOverhead',
    dropshot: kind === 'ue' ? 'ueDropshot' : 'winDropshot',
    lob: kind === 'ue' ? 'ueLob' : 'winLob',
    slice: kind === 'ue' ? 'ueSlice' : 'winSlice',
    passing: kind === 'ue' ? 'uePassing' : 'winPassing',
  };
  if (map[type]) { baseline[map[type]]++; }
  if (type === '' || type === undefined) {
    if (hand === 'forehand') { if (kind === 'ue') baseline.ueForehand++; else baseline.winForehand++; }
    else if (hand === 'backhand') { if (kind === 'ue') baseline.ueBackhand++; else baseline.winBackhand++; }
  }
  // For slice, also record hand? Engine records forehand/backhand slice separately but we keep single slice bucket.
}

// ─── Build the final structured report object ───────────────────────────────
function buildReport(rows, serve, baseline, net, pressure, overall, ts, subjectName, opponentName) {
  var totalPoints = overall.pointsWon + overall.pointsLost;

  // Q1: serve patterns
  var q1 = {
    firstServe: {
      overall: dirDist(serve.firstAll.w, serve.firstAll.b, serve.firstAll.t),
      deuce: dirDist(serve.firstDeuce.w, serve.firstDeuce.b, serve.firstDeuce.t),
      ad: dirDist(serve.firstAd.w, serve.firstAd.b, serve.firstAd.t),
      highPressure: dirDist(serve.firstHP.w, serve.firstHP.b, serve.firstHP.t),
      gamePoint: dirDist(serve.firstGP.w, serve.firstGP.b, serve.firstGP.t),
    },
    secondServe: {
      overall: dirDist(serve.secondAll.w, serve.secondAll.b, serve.secondAll.t),
      deuce: dirDist(serve.secondDeuce.w, serve.secondDeuce.b, serve.secondDeuce.t),
      ad: dirDist(serve.secondAd.w, serve.secondAd.b, serve.secondAd.t),
      highPressure: dirDist(serve.secondHP.w, serve.secondHP.b, serve.secondHP.t),
      gamePoint: dirDist(serve.secondGP.w, serve.secondGP.b, serve.secondGP.t),
    },
    sequence: {
      firstDeuce: serve.seqFirstDeuce,
      firstAd: serve.seqFirstAd,
      secondDeuce: serve.seqSecondDeuce,
      secondAd: serve.seqSecondAd,
    },
  };

  // Q2: serve strengths/weaknesses
  var firstServeInPct = pctObj(serve.firstIn, serve.firstAttempts, THRESHOLDS.servePct);
  var firstServeWonPct = pctObj(serve.firstWon, serve.firstIn, THRESHOLDS.servePct);
  var secondServeWonPct = pctObj(serve.secondWon, serve.secondServes, THRESHOLDS.servePct);
  var aceRate = pctObj(serve.aces, serve.firstAttempts, THRESHOLDS.servePct);
  var dfRate = pctObj(serve.doubleFaults, serve.firstAttempts, THRESHOLDS.servePct);
  var q2 = {
    firstServeInPct: firstServeInPct,
    firstServeWonPct: firstServeWonPct,
    secondServeWonPct: secondServeWonPct,
    aces: serve.aces,
    doubleFaults: serve.doubleFaults,
    unreturnableServes: serve.unreturnable,
    aceRate: aceRate,
    dfRate: dfRate,
    faultTendency: dirDist(serve.faultNet, serve.faultOut, 0).n >= THRESHOLDS.serveDirection
      ? { net: serve.faultNet, out: serve.faultOut,
          dominant: serve.faultNet >= serve.faultOut ? 'net' : 'out',
          sufficient: (serve.faultNet + serve.faultOut) >= THRESHOLDS.serveDirection }
      : { net: serve.faultNet, out: serve.faultOut, sufficient: false },
    strengths: [],
    weaknesses: [],
  };
  if (firstServeWonPct.sufficient && firstServeWonPct.value >= 70) {
    q2.strengths.push({ label: 'Strong first-serve win rate', evidence: firstServeWonPct.value + '% won on 1st serve (' + firstServeWonPct.n + '/' + firstServeWonPct.d + ')' });
  }
  if (secondServeWonPct.sufficient && secondServeWonPct.value <= 45) {
    q2.weaknesses.push({ label: 'Weak second-serve win rate', evidence: secondServeWonPct.value + '% won on 2nd serve (' + secondServeWonPct.n + '/' + secondServeWonPct.d + ')' });
  }
  if (dfRate.sufficient && dfRate.value >= 8) {
    q2.weaknesses.push({ label: 'High double-fault rate', evidence: serve.doubleFaults + ' double faults (' + dfRate.value + '% of serve points)' });
  }
  if (aceRate.sufficient && aceRate.value >= 12) {
    q2.strengths.push({ label: 'Effective ace / free-point serve', evidence: serve.aces + ' aces (' + aceRate.value + '% of serve points)' });
  }

  // Q3: baseline strengths/weaknesses
  var ueByShot = [
    { shot: 'forehand', n: baseline.ueForehand },
    { shot: 'backhand', n: baseline.ueBackhand },
    { shot: 'slice', n: baseline.ueSlice },
    { shot: 'volley', n: baseline.ueVolley },
    { shot: 'overhead', n: baseline.ueOverhead },
    { shot: 'dropshot', n: baseline.ueDropshot },
    { shot: 'lob', n: baseline.ueLob },
    { shot: 'passing', n: baseline.uePassing },
  ];
  var winByShot = [
    { shot: 'forehand', n: baseline.winForehand },
    { shot: 'backhand', n: baseline.winBackhand },
    { shot: 'slice', n: baseline.winSlice },
    { shot: 'volley', n: baseline.winVolley },
    { shot: 'overhead', n: baseline.winOverhead },
    { shot: 'dropshot', n: baseline.winDropshot },
    { shot: 'lob', n: baseline.winLob },
    { shot: 'passing', n: baseline.winPassing },
  ];
  ueByShot.forEach(function (s) { s.rate = baseline.ueTotal > 0 ? Math.round((s.n / baseline.ueTotal) * 100) : 0; });
  winByShot.forEach(function (s) { s.rate = baseline.winTotal > 0 ? Math.round((s.n / baseline.winTotal) * 100) : 0; });
  var q3 = {
    unforcedErrors: { total: baseline.ueTotal, net: baseline.ueNet, out: baseline.ueOut, byShot: ueByShot },
    winners: { total: baseline.winTotal, byShot: winByShot },
    strengths: [],
    weaknesses: [],
  };
  // baseline strength/weakness needs >= THRESHOLDS.shotStrength relevant shots
  var groundUe = baseline.ueForehand + baseline.ueBackhand;
  if (groundUe >= THRESHOLDS.shotStrength) {
    var fhRate = baseline.ueForehand / groundUe;
    if (fhRate >= 0.65) {
      q3.weaknesses.push({ label: 'Forehand is the leakier side', evidence: baseline.ueForehand + ' forehand vs ' + baseline.ueBackhand + ' backhand unforced errors' });
    } else if (fhRate <= 0.35) {
      q3.weaknesses.push({ label: 'Backhand is the leakier side', evidence: baseline.ueBackhand + ' backhand vs ' + baseline.ueForehand + ' forehand unforced errors' });
    }
  }
  var groundWin = baseline.winForehand + baseline.winBackhand;
  if (groundWin >= THRESHOLDS.shotStrength) {
    if (baseline.winForehand / groundWin >= 0.65) {
      q3.strengths.push({ label: 'Forehand is the bigger weapon', evidence: baseline.winForehand + ' forehand vs ' + baseline.winBackhand + ' backhand winners/forced errors' });
    } else if (baseline.winBackhand / groundWin >= 0.65) {
      q3.strengths.push({ label: 'Backhand is the bigger weapon', evidence: baseline.winBackhand + ' backhand vs ' + baseline.winForehand + ' forehand winners/forced errors' });
    }
  }
  if (baseline.ueTotal >= THRESHOLDS.shotStrength && baseline.ueNet / Math.max(1, baseline.ueTotal) >= 0.5) {
    q3.weaknesses.push({ label: 'Tends to net the ball on errors', evidence: baseline.ueNet + ' of ' + baseline.ueTotal + ' unforced errors went into the net' });
  }

  // Q4: net game
  var netWinPct = pctObj(net.won, net.played, THRESHOLDS.shotStrength);
  var q4 = {
    netPointsPlayed: net.played,
    netPointsWon: net.won,
    netWinPct: netWinPct,
    volley: { won: baseline.winVolley, unforcedErrors: baseline.ueVolley },
    overhead: { won: baseline.winOverhead, unforcedErrors: baseline.ueOverhead },
    assessment: null,
  };
  if (net.played >= THRESHOLDS.shotStrength) {
    q4.assessment = {
      label: netWinPct.value >= 55 ? 'Strong at net' : netWinPct.value <= 40 ? 'Weak at net' : 'Neutral at net',
      evidence: net.won + '/' + net.played + ' net points won (' + netWinPct.value + '%)',
      sufficient: true,
    };
  } else {
    q4.assessment = { label: 'Insufficient net data', evidence: 'only ' + net.played + ' net points played', sufficient: false };
  }

  // Q5: time-series
  var q5 = analyzeTimeSeries(ts.buckets);

  // Q6: mental
  var hpWinPct = pctObj(pressure.hpWon, pressure.hpWon + pressure.hpLost, THRESHOLDS.highPressure);
  var overallUeRate = overall.pointsLost > 0 ? pct(pressure.hpUE + 0, totalPoints) : null; // placeholder
  // UE rate under pressure (per pressure point lost) vs overall UE rate (per point lost)
  var ueRateUnderPressure = pressure.hpLost > 0 ? Math.round((pressure.hpUE / pressure.hpLost) * 100) : null;
  var ueRateOverall = overall.pointsLost > 0
    ? Math.round((baseline.ueTotal / overall.pointsLost) * 100) : null;
  var breakConv = pctObj(pressure.breakPointWon, pressure.breakPointCreated, THRESHOLDS.breakGamePoint);
  var gameConv = pctObj(pressure.gamePointWon, pressure.gamePointCreated, THRESHOLDS.breakGamePoint);
  var q6 = {
    highPressure: {
      won: pressure.hpWon, lost: pressure.hpLost,
      winPct: hpWinPct,
      onServe: pressure.hpOnServe, onReturn: pressure.hpOnReturn,
      firstServeInPct: pctObj(pressure.hpFirstIn, pressure.hpServed, THRESHOLDS.servePct),
      ueUnderPressure: pressure.hpUE,
      ueRateUnderPressure: ueRateUnderPressure,
      ueRateOverall: ueRateOverall,
      sufficient: (pressure.hpWon + pressure.hpLost) >= THRESHOLDS.highPressure,
    },
    breakPoints: { created: pressure.breakPointCreated, won: pressure.breakPointWon, convPct: breakConv },
    gamePoints: { created: pressure.gamePointCreated, won: pressure.gamePointWon, convPct: gameConv },
    assessment: [],
  };
  if (q6.highPressure.sufficient && ueRateUnderPressure !== null && ueRateOverall !== null) {
    if (ueRateUnderPressure - ueRateOverall >= 15) {
      q6.assessment.push({ label: 'More error-prone under pressure', evidence: ueRateUnderPressure + '% of lost pressure points were unforced errors vs ' + ueRateOverall + '% overall' });
    } else if (ueRateOverall - ueRateUnderPressure >= 15) {
      q6.assessment.push({ label: 'Tighter under pressure', evidence: ueRateUnderPressure + '% unforced-error rate under pressure vs ' + ueRateOverall + '% overall' });
    }
  }
  if (hpWinPct.sufficient) {
    if (hpWinPct.value >= 55) q6.assessment.push({ label: 'Clutch performer', evidence: 'won ' + pressure.hpWon + '/' + (pressure.hpWon + pressure.hpLost) + ' high-pressure points (' + hpWinPct.value + '%)' });
    else if (hpWinPct.value <= 40) q6.assessment.push({ label: 'Struggled in clutch moments', evidence: 'won ' + pressure.hpWon + '/' + (pressure.hpWon + pressure.hpLost) + ' high-pressure points (' + hpWinPct.value + '%)' });
  }
  if (breakConv.sufficient && breakConv.value >= 50) {
    q6.assessment.push({ label: 'Clinical break-point converter', evidence: pressure.breakPointWon + '/' + pressure.breakPointCreated + ' break points (' + breakConv.value + '%)' });
  } else if (breakConv.sufficient && breakConv.value <= 30) {
    q6.assessment.push({ label: 'Wasted break-point chances', evidence: pressure.breakPointWon + '/' + pressure.breakPointCreated + ' break points (' + breakConv.value + '%)' });
  }

  // Q7: diagnosis (templated, deterministic)
  var q7 = buildDiagnosis(overall, pressure, serve, baseline, q2, q3, q6, subjectName, opponentName, totalPoints);
  // Q8: recommendations (templated, deterministic)
  var q8 = buildRecommendations(q2, q3, q4, q6, q5);

  return {
    subject: subjectName || 'subject',
    opponent: opponentName || 'opponent',
    totalPoints: totalPoints,
    pointsWon: { subject: overall.pointsWon, opponent: overall.pointsLost },
    avgRallyLength: overall.rallyCount > 0 ? Math.round(overall.rallySum / overall.rallyCount) : 0,
    longestRally: overall.longestRally,
    rallyBuckets: { short: overall.shortWon + overall.shortLost, medium: overall.medWon + overall.medLost, long: overall.longWon + overall.longLost },
    returnPerformance: { winners: overall.returnWinner, unforcedErrors: overall.returnUE },
    q1_serve_patterns: q1,
    q2_serve: q2,
    q3_baseline: q3,
    q4_net: q4,
    q5_timeseries: q5,
    q6_mental: q6,
    q7_diagnosis: q7,
    q8_recommendations: q8,
    // Templated prose mirrors of Q1-Q6, same pattern as Q7/Q8: deterministic,
    // no LLM involvement. Lets AI narrative modes rephrase-only end to end
    // instead of ever re-deriving numbers from raw counters.
    q1_narrative: buildQ1Narrative(q1),
    q2_narrative: buildQ2Narrative(q2),
    q3_narrative: buildQ3Narrative(q3),
    q4_narrative: buildQ4Narrative(q4),
    q5_narrative: buildQ5Narrative(q5),
    q6_narrative: buildQ6Narrative(q6),
  };
}

// ─── Templated Q1-Q6 narratives (rephrase source for AI modes) ──────────────
function fmtPctObj(obj) {
  if (!obj || obj.value === null || obj.value === undefined) return 'n/a';
  return obj.sufficient === false
    ? obj.value + '% (n=' + (obj.n != null ? obj.n : obj.d) + ', thin sample)'
    : obj.value + '% (' + obj.n + '/' + obj.d + ')';
}

function buildQ1Narrative(q1) {
  var parts = [];
  var overall = q1.firstServe.overall;
  parts.push(overall.sufficient && overall.dominant
    ? 'First serve favors the ' + overall.dominant + ' (' + overall.dominantPct + '% of ' + overall.n + ' serves).'
    : 'First-serve direction sample is too small for a pattern (n=' + overall.n + ').');
  var second = q1.secondServe.overall;
  if (second.sufficient && second.dominant) {
    parts.push('Second serve favors the ' + second.dominant + ' (' + second.dominantPct + '% of ' + second.n + ' serves).');
  }
  var hp = q1.firstServe.highPressure;
  if (hp.sufficient && hp.dominant) {
    parts.push('Under high pressure, the first serve goes ' + hp.dominant + ' most often (' + hp.dominantPct + '% of ' + hp.n + ').');
  }
  var gp = q1.firstServe.gamePoint;
  if (gp.sufficient && gp.dominant) {
    parts.push('On game point, the first serve goes ' + gp.dominant + ' most often (' + gp.dominantPct + '% of ' + gp.n + ').');
  }
  return parts.join(' ');
}

function buildQ2Narrative(q2) {
  var parts = [];
  parts.push('First serve in ' + fmtPctObj(q2.firstServeInPct) + ', won ' + fmtPctObj(q2.firstServeWonPct) +
    '; second serve won ' + fmtPctObj(q2.secondServeWonPct) + '.');
  parts.push(q2.aces + ' aces, ' + q2.doubleFaults + ' double faults, ' + q2.unreturnableServes + ' unreturnable serves.');
  q2.strengths.forEach(function (s) { parts.push(s.label + ': ' + s.evidence + '.'); });
  q2.weaknesses.forEach(function (w) { parts.push(w.label + ': ' + w.evidence + '.'); });
  return parts.join(' ');
}

function buildQ3Narrative(q3) {
  var parts = [];
  parts.push(q3.unforcedErrors.total + ' unforced errors (' + q3.unforcedErrors.net + ' net, ' + q3.unforcedErrors.out + ' out), ' +
    q3.winners.total + ' winners/forced errors.');
  q3.strengths.forEach(function (s) { parts.push(s.label + ': ' + s.evidence + '.'); });
  q3.weaknesses.forEach(function (w) { parts.push(w.label + ': ' + w.evidence + '.'); });
  if (!q3.strengths.length && !q3.weaknesses.length) {
    parts.push('No standout shot-side strength or weakness met the sample-size threshold.');
  }
  return parts.join(' ');
}

function buildQ4Narrative(q4) {
  if (!q4.assessment) return 'No net-game data available.';
  return q4.assessment.label + '. ' + q4.assessment.evidence + '.';
}

function buildQ5Narrative(q5) {
  var parts = [];
  parts.push(q5.consistency.sufficient
    ? q5.consistency.label + ' (mean point differential ' + q5.consistency.mean + '/bucket, variance ' + q5.consistency.variance + ').'
    : 'Insufficient data to assess consistency.');
  (q5.stretches || []).forEach(function (s) {
    parts.push((s.type === 'better' ? 'Better stretch' : 'Worse stretch') + ': ' + s.evidence + '.');
  });
  return parts.join(' ');
}

function buildQ6Narrative(q6) {
  var parts = [];
  parts.push(q6.highPressure.sufficient
    ? 'Won ' + q6.highPressure.won + '/' + (q6.highPressure.won + q6.highPressure.lost) + ' high-pressure points (' + q6.highPressure.winPct.value + '%).'
    : 'Insufficient high-pressure data for a clutch assessment.');
  (q6.assessment || []).forEach(function (a) { parts.push(a.label + ': ' + a.evidence + '.'); });
  return parts.join(' ');
}

// ─── Time-series analysis ────────────────────────────────────────────────────
function analyzeTimeSeries(buckets) {
  // Bug fix 2: strip trailing empty (n=0) non-marker buckets produced when a new
  // game/set transition fires right at the end of the point list.
  var trimmed = buckets.slice();
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1].isSetMarker && trimmed[trimmed.length - 1].n === 0) {
    trimmed.pop();
  }

  var dataBuckets = trimmed.filter(function (b) { return !b.isSetMarker; });

  // Bug fix 1: label counter counts only real data buckets, so set markers don't
  // cause label numbers to skip.
  var dataBucketCount = 0;
  var q5 = {
    buckets: trimmed.map(function (b) {
      if (b.isSetMarker) return { isSetMarker: true, label: 'set' };
      dataBucketCount++;
      return {
        label: 'G' + dataBucketCount,
        winners: b.winners, unforcedErrors: b.unforcedErrors,
        aces: b.aces, doubleFaults: b.doubleFaults,
        pointsWon: b.pointsWon, pointsLost: b.pointsLost,
        diff: b.pointsWon - b.pointsLost, n: b.n,
        sufficient: b.n >= THRESHOLDS.timeSeriesBucket,
      };
    }),
    consistency: { label: 'Insufficient data', variance: null, sufficient: false },
    stretches: [],
  };

  // Consistency: variance of point-differential across buckets with enough points
  var usable = dataBuckets.filter(function (b) { return b.n >= THRESHOLDS.timeSeriesBucket; });
  if (usable.length >= 3) {
    var diffs = usable.map(function (b) { return b.pointsWon - b.pointsLost; });
    var mean = diffs.reduce(function (a, b) { return a + b; }, 0) / diffs.length;
    var variance = diffs.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / diffs.length;
    q5.consistency = {
      mean: Math.round(mean * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      label: variance <= 4 ? 'Consistent throughout' : variance <= 12 ? 'Moderately streaky' : 'Streaky — performance swung between stretches',
      sufficient: true,
    };
    // Detect better/worse stretches: compare first-half vs second-half mean diff
    var half = Math.floor(usable.length / 2);
    var firstHalf = usable.slice(0, half);
    var secondHalf = usable.slice(half);
    var fhMean = avg(firstHalf.map(function (b) { return b.pointsWon - b.pointsLost; }));
    var shMean = avg(secondHalf.map(function (b) { return b.pointsWon - b.pointsLost; }));
    if (Math.abs(shMean - fhMean) >= 2) {
      q5.stretches.push({
        type: shMean > fhMean ? 'better' : 'worse',
        evidence: 'point differential ' + (shMean > fhMean ? 'improved' : 'declined') + ' from ' + Math.round(fhMean * 10) / 10 + ' early to ' + Math.round(shMean * 10) / 10 + ' late',
      });
    }
    // Unforced-error trend
    var fhUE = avg(firstHalf.map(function (b) { return b.unforcedErrors; }));
    var shUE = avg(secondHalf.map(function (b) { return b.unforcedErrors; }));
    if (fhUE > 0 && shUE > 0 && Math.abs(shUE - fhUE) >= 1) {
      q5.stretches.push({
        type: shUE < fhUE ? 'better' : 'worse',
        evidence: 'unforced errors ' + (shUE < fhUE ? 'fell' : 'rose') + ' from ' + Math.round(fhUE * 10) / 10 + ' to ' + Math.round(shUE * 10) / 10 + ' per bucket',
      });
    }
  }
  return q5;
}
function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }

// ─── Templated Q7 (diagnosis) ────────────────────────────────────────────────
function buildDiagnosis(overall, pressure, serve, baseline, q2, q3, q6, subjectName, opponentName, totalPoints) {
  var factors = [];
  var won = overall.pointsWon, lost = overall.pointsLost;
  var result = won > lost ? 'won' : (lost > won ? 'lost' : 'tied');

  factors.push({
    label: 'Point balance',
    evidence: subjectName + ' ' + result + ' the point battle ' + won + '-' + lost + (totalPoints > 0 ? ' (' + Math.round((won / totalPoints) * 100) + '% of points)' : ''),
  });

  // Break-point conversion swing
  if (pressure.breakPointCreated >= THRESHOLDS.breakGamePoint) {
    factors.push({
      label: 'Break-point conversion',
      evidence: 'converted ' + pressure.breakPointWon + '/' + pressure.breakPointCreated + ' break points (' + pct(pressure.breakPointWon, pressure.breakPointCreated) + '%)',
    });
  }

  // Serve dominance
  if (q2.firstServeWonPct.sufficient) {
    factors.push({
      label: 'First-serve dominance',
      evidence: 'won ' + q2.firstServeWonPct.value + '% of first-serve points (' + q2.firstServeWonPct.n + '/' + q2.firstServeWonPct.d + ')',
    });
  }
  if (q2.secondServeWonPct.sufficient && q2.secondServeWonPct.value <= 45) {
    factors.push({
      label: 'Second-serve vulnerability',
      evidence: 'only ' + q2.secondServeWonPct.value + '% of second-serve points won — the opponent targeted the second serve',
    });
  }

  // Unforced errors
  if (baseline.ueTotal >= THRESHOLDS.shotStrength) {
    factors.push({
      label: 'Error management',
      evidence: baseline.ueTotal + ' unforced errors (' + (overall.pointsLost > 0 ? Math.round((baseline.ueTotal / overall.pointsLost) * 100) : 0) + '% of points lost were self-inflicted)',
    });
  }
  // Backhand/forehand leak
  if (q3.weaknesses.length > 0) {
    factors.push({ label: 'Shot-side weakness', evidence: q3.weaknesses.map(function (w) { return w.evidence; }).join('; ') });
  }

  // Clutch
  if (q6.highPressure.sufficient) {
    factors.push({
      label: 'Clutch performance',
      evidence: 'won ' + q6.highPressure.won + '/' + (q6.highPressure.won + q6.highPressure.lost) + ' high-pressure points (' + q6.highPressure.winPct.value + '%)',
    });
  }

  var summary;
  if (result === 'won') {
    summary = subjectName + ' won the match by ' + won + '-' + lost + '. ' +
      (q2.firstServeWonPct.sufficient ? 'A ' + q2.firstServeWonPct.value + '% first-serve win rate ' : '') +
      (pressure.breakPointCreated >= THRESHOLDS.breakGamePoint ? 'and converting ' + pressure.breakPointWon + '/' + pressure.breakPointCreated + ' break points ' : '') +
      'were decisive.';
  } else if (result === 'lost') {
    summary = subjectName + ' lost the match ' + won + '-' + lost + '. ' +
      (q2.secondServeWonPct.sufficient && q2.secondServeWonPct.value <= 45 ? 'A weak second serve (' + q2.secondServeWonPct.value + '% won) ' : '') +
      (baseline.ueTotal >= THRESHOLDS.shotStrength ? 'and ' + baseline.ueTotal + ' unforced errors ' : '') +
      'were the main causes.';
  } else {
    summary = subjectName + ' tied the point battle ' + won + '-' + lost + '.';
  }

  return { summary: summary, result: result, factors: factors };
}

// ─── Templated Q8 (recommendations) ──────────────────────────────────────────
function buildRecommendations(q2, q3, q4, q6, q5) {
  var recs = [];

  if (q2.weaknesses.length > 0) {
    q2.weaknesses.forEach(function (w) {
      var area = 'Serve';
      var rec = '';
      if (w.label.indexOf('second-serve') !== -1) rec = 'Second-serve plus-one drills: practice the 2nd-serve → first-ball pattern so the +1 neutralizes returns; raise 2nd-serve win % above 50%.';
      else if (w.label.indexOf('double-fault') !== -1) rec = 'Reduce double faults: increase 2nd-serve first-make percentage with targets; practice serving under fatigue.';
      else rec = 'Serve work: ' + w.evidence;
      recs.push({ area: area, recommendation: rec, evidence: w.evidence });
    });
  }
  if (q2.firstServeInPct.sufficient && q2.firstServeInPct.value < 55) {
    recs.push({ area: 'Serve', recommendation: 'Raise first-serve percentage: it sits at ' + q2.firstServeInPct.value + '% — target 60–65% with a safer first-serve trajectory while keeping placement.', evidence: q2.firstServeInPct.value + '% first serves in' });
  }

  q3.weaknesses.forEach(function (w) {
    var rec = '';
    if (w.label.indexOf('Backhand') !== -1) rec = 'Backhand reinforcement: cross-court consistency drills under pressure; reduce backhand unforced errors with high-rep target feeding.';
    else if (w.label.indexOf('Forehand') !== -1) rec = 'Forehand consistency: high-volume target feeding to stabilize the forehand under rally pressure.';
    else if (w.label.indexOf('net') !== -1) rec = 'Clearance work: practice hitting with more net margin (depth + height) to cut net errors.';
    else rec = w.label + ': ' + w.evidence;
    recs.push({ area: 'Groundstrokes', recommendation: rec, evidence: w.evidence });
  });

  if (q4.assessment && !q4.assessment.sufficient) {
    recs.push({ area: 'Net game', recommendation: 'Get to the net more — only ' + q4.netPointsPlayed + ' net points recorded. Approach-and-volley drills to add a finishing dimension.', evidence: q4.assessment.evidence });
  } else if (q4.assessment && q4.assessment.sufficient && q4.assessment.label.indexOf('Weak') !== -1) {
    recs.push({ area: 'Net game', recommendation: 'Volley technique and overhead tracking: ' + q4.volley.unforcedErrors + ' volley / ' + q4.overhead.unforcedErrors + ' overhead errors — feed-and-volley reps with footwork focus.', evidence: q4.assessment.evidence });
  }

  q6.assessment.forEach(function (a) {
    var rec = '';
    if (a.label.indexOf('error-prone') !== -1) rec = 'Pressure reps: simulate 30-30 / break-point scenarios in practice; build a between-point routine to reduce tension-driven errors.';
    else if (a.label.indexOf('Clutch') !== -1) rec = 'Keep trusting the patterns that win clutch points — your high-pressure win rate is strong; rehearse those point patterns deliberately.';
    else if (a.label.indexOf('break-point') !== -1 && a.label.indexOf('Wasted') !== -1) rec = 'Return-game finishing: break-point conversion is low — drill aggressive return positioning on 2nd serves to convert chances.';
    else rec = a.label + ': ' + a.evidence;
    recs.push({ area: 'Mental / tactical', recommendation: rec, evidence: a.evidence });
  });

  if (q5.consistency.sufficient && q5.consistency.label.indexOf('Streaky') !== -1) {
    recs.push({ area: 'Consistency', recommendation: 'Reduce performance swings: the match had streaky stretches — work on between-point routine and steady tactical selection to avoid droughts.', evidence: q5.consistency.label });
  }

  if (recs.length === 0) {
    recs.push({ area: 'General', recommendation: 'No standout weakness surfaced from this match\'s data. Keep collecting matches — patterns emerge across multiple outings.', evidence: 'insufficient signal in single match' });
  }
  return recs;
}

// ─── Node export (Apps Script ignores this) ─────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeInsights: computeInsights,
    getServeSide: getServeSide,
    isGameOrBreakPoint: isGameOrBreakPoint,
    isHighPressurePoint: isHighPressurePoint,
    THRESHOLDS: THRESHOLDS,
  };
}
