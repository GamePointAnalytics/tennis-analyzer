// Local validation harness for InsightsLib.computeInsights.
// Loads the test xlsx, normalizes a chosen side to "subject", runs the engine,
// and prints a readable summary so we can eyeball correctness against the raw
// engine's known numbers for the Stephen vs Milan test match.
//
// Run: node backend/test/insights_validate.js

const path = require('path');
const XLSX = require(path.join(__dirname, '..', '..', 'frontend-native', 'node_modules', 'xlsx'));
const { computeInsights } = require(path.join(__dirname, '..', 'src', 'InsightsLib.js'));

const wb = XLSX.readFile(path.join(__dirname, '..', '..', 'data', 'Tennis_Analyzer_Test.xlsx'));
const ws = wb.Sheets['Points'];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

// All points in this file belong to one match (adde8126): Stephen (p1) vs Milan Prabhu (p2).
const P1 = 'Stephen';
const P2 = 'Milan Prabhu';

// Normalize so the chosen player becomes "subject".
function normalizeFor(rawRows, subjectName, opponentName) {
  return rawRows.map(r => {
    const n = Object.assign({}, r);
    n['player 1'] = 'subject';
    n['player 2'] = 'opponent';
    const remap = v => v === subjectName ? 'subject' : v === opponentName ? 'opponent' : v;
    n['server'] = remap(String(r['server']).trim());
    n['winner'] = remap(String(r['winner']).trim());
    // ensure numbers
    n['rally length'] = Number(r['rally length']) || 0;
    n['game score 1 pre'] = Number(r['game score 1 pre']) || 0;
    n['game score 2 pre'] = Number(r['game score 2 pre']) || 0;
    n['game score 1 post'] = Number(r['game score 1 post']) || 0;
    n['game score 2 post'] = Number(r['game score 2 post']) || 0;
    n['set score 1 pre'] = Number(r['set score 1 pre']) || 0;
    n['set score 2 pre'] = Number(r['set score 2 pre']) || 0;
    n['tiebreak score 1 pre'] = r['tiebreak score 1 pre'] === '' ? 0 : Number(r['tiebreak score 1 pre']);
    n['tiebreak score 2 pre'] = r['tiebreak score 2 pre'] === '' ? 0 : Number(r['tiebreak score 2 pre']);
    n['match index'] = String(r['match index']);
    return n;
  });
}

function run(subjectName, opponentName) {
  console.log('\n========================================');
  console.log(' SUBJECT: ' + subjectName + '   (opponent: ' + opponentName + ')');
  console.log('========================================');
  const norm = normalizeFor(rows, subjectName, opponentName);
  const rep = computeInsights(norm, subjectName, opponentName);

  console.log('Total points:', rep.totalPoints, '| won', rep.pointsWon.subject, '-', rep.pointsWon.opponent);
  console.log('Avg rally:', rep.avgRallyLength, '| longest', rep.longestRally);

  console.log('\n--- Q1 Serve patterns (first serve) ---');
  const q1 = rep.q1_serve_patterns;
  ['overall','deuce','ad','highPressure','gamePoint'].forEach(s => {
    const d = q1.firstServe[s];
    console.log('  first.' + s + ':', d.n, 'serves', +d.n>=6 ? '' : '(thin)',
      d.sufficient ? 'dominant=' + d.dominant + ' ' + d.dominantPct + '%' : 'W/B/T=' + d.wide+'/'+d.body+'/'+d.t);
  });
  ['overall','deuce','ad','highPressure','gamePoint'].forEach(s => {
    const d = q1.secondServe[s];
    console.log('  second.' + s + ':', d.n, 'serves', d.sufficient ? 'dominant=' + d.dominant + ' ' + d.dominantPct + '%' : 'W/B/T=' + d.wide+'/'+d.body+'/'+d.t);
  });
  console.log('  seq first/deuce:', q1.sequence.firstDeuce);
  console.log('  seq first/ad:   ', q1.sequence.firstAd);

  console.log('\n--- Q2 Serve strengths/weaknesses ---');
  const q2 = rep.q2_serve;
  console.log('  1st in %:', q2.firstServeInPct.value, '('+q2.firstServeInPct.n+'/'+q2.firstServeInPct.d+')');
  console.log('  1st won %:', q2.firstServeWonPct.value, '('+q2.firstServeWonPct.n+'/'+q2.firstServeWonPct.d+')');
  console.log('  2nd won %:', q2.secondServeWonPct.value, '('+q2.secondServeWonPct.n+'/'+q2.secondServeWonPct.d+')');
  console.log('  aces:', q2.aces, 'DFs:', q2.doubleFaults, 'unreturnable:', q2.unreturnableServes);
  console.log('  strengths:', q2.strengths.map(s=>s.label).join('; ') || '(none)');
  console.log('  weaknesses:', q2.weaknesses.map(s=>s.label).join('; ') || '(none)');

  console.log('\n--- Q3 Baseline ---');
  const q3 = rep.q3_baseline;
  console.log('  UE total:', q3.unforcedErrors.total, '(net', q3.unforcedErrors.net+', out', q3.unforcedErrors.out+')');
  q3.unforcedErrors.byShot.filter(s=>s.n>0).forEach(s=>console.log('    UE '+s.shot+':', s.n, '('+s.rate+'%)'));
  console.log('  Winners total:', q3.winners.total);
  q3.winners.byShot.filter(s=>s.n>0).forEach(s=>console.log('    W  '+s.shot+':', s.n, '('+s.rate+'%)'));
  console.log('  strengths:', q3.strengths.map(s=>s.label).join('; ') || '(none)');
  console.log('  weaknesses:', q3.weaknesses.map(s=>s.label).join('; ') || '(none)');

  console.log('\n--- Q4 Net ---');
  const q4 = rep.q4_net;
  console.log('  net points:', q4.netPointsPlayed, 'won', q4.netPointsWon, 'volley W/UE', q4.volley.won+'/'+q4.volley.unforcedErrors, 'overhead W/UE', q4.overhead.won+'/'+q4.overhead.unforcedErrors);
  console.log('  assessment:', q4.assessment && q4.assessment.label, '-', q4.assessment && q4.assessment.evidence);

  console.log('\n--- Q5 Time-series ---');
  const q5 = rep.q5_timeseries;
  console.log('  consistency:', q5.consistency.label, 'mean', q5.consistency.mean, 'var', q5.consistency.variance);
  console.log('  buckets:', q5.buckets.filter(b=>!b.isSetMarker).map(b=>b.n+'pts/diff'+b.diff+'ue'+b.unforcedErrors).join(' | '));
  console.log('  set markers:', q5.buckets.filter(b=>b.isSetMarker).length);
  console.log('  stretches:', q5.stretches.map(s=>s.type+': '+s.evidence).join(' | ') || '(none)');

  console.log('\n--- Q6 Mental ---');
  const q6 = rep.q6_mental;
  console.log('  HP won/lost:', q6.highPressure.won+'/'+q6.highPressure.lost, 'win%', q6.highPressure.winPct.value);
  console.log('  HP UE:', q6.highPressure.ueUnderPressure, 'UE% under pressure', q6.highPressure.ueRateUnderPressure, 'vs overall', q6.highPressure.ueRateOverall);
  console.log('  break pts:', q6.breakPoints.won+'/'+q6.breakPoints.created, '('+q6.breakPoints.convPct.value+'%)');
  console.log('  game pts:', q6.gamePoints.won+'/'+q6.gamePoints.created, '('+q6.gamePoints.convPct.value+'%)');
  console.log('  assessment:', q6.assessment.map(a=>a.label).join('; ') || '(none)');

  console.log('\n--- Q7 Diagnosis ---');
  console.log('  summary:', rep.q7_diagnosis.summary);
  rep.q7_diagnosis.factors.forEach(f=>console.log('   -', f.label+':', f.evidence));

  console.log('\n--- Q8 Recommendations ---');
  rep.q8_recommendations.forEach((r,i)=>console.log('  '+(i+1)+'. ['+r.area+']', r.recommendation));
}

run(P1, P2);
run(P2, P1);
