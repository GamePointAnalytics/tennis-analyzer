import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import { getSettings } from '../utils/settings';
import { fetchInsightsFromCloud } from '../utils/api';
import { synthesizeDiagnosis, writeFullReport } from '../utils/anthropic';
import {
  getInsightsCache,
  saveInsightsCache,
} from '../database/db';

// ─── Chart palette (validated via dataviz skill) ─────────────────────────────
// Serve directions: categorical, fixed order. CVD worst ΔE 46 (protan).
const SERVE_COLORS = { wide: '#3B82F6', body: '#F59E0B', t: '#10B981' };
// Momentum diverging: green = subject winning, red = subject losing.
// Red/green pair CVD ΔE 24 (protan) — above the ≥12 target.
const MOMENTUM_POS = '#10B981';
const MOMENTUM_NEG = '#EF4444';
const STRENGTH = '#10B981';
const WEAKNESS = '#EF4444';

const DEFAULT_MODE = 'hybrid';

const getActiveKey = (s) => {
  const provider = s.aiProvider || 'anthropic';
  if (provider === 'anthropic') return s.anthropicApiKey || '';
  if (provider === 'openai') return s.openaiApiKey || '';
  if (provider === 'gemini') return s.geminiApiKey || '';
  if (provider === 'openrouter') return s.openrouterApiKey || '';
  return '';
};

export default function InsightsReportScreen({ route, navigation }) {
  const routeMatchIndexes = route.params?.matchIndexes || [];
  const routeSide = route.params?.side || 'player1';

  const [matchIndexes] = useState(routeMatchIndexes);
  const [side, setSide] = useState(routeSide);
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [apiKey, setApiKey] = useState('');

  const [insights, setInsights] = useState(null);
  const [llmText, setLlmText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false); // LLM synthesis in-flight
  const [error, setError] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [expanded, setExpanded] = useState({
    q1: true, q2: false, q3: false, q4: false, q5: true, q6: false, q7: true, q8: true,
  });

  useEffect(() => {
    // Load mode + key from settings, then fetch.
    (async () => {
      const s = await getSettings();
      setMode(s.analysisMode || DEFAULT_MODE);
      const activeKey = getActiveKey(s);
      setApiKey(activeKey);
      await load(s.analysisMode || DEFAULT_MODE, activeKey, routeSide);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (currentMode, currentKey, currentSide, bypassCache = false) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cache lookup (skipped on manual refresh)
      if (!bypassCache) {
        const cached = await getInsightsCache(matchIndexes, currentSide, currentMode);
        if (cached) {
          setInsights(cached.data);
          setLlmText(cached.llmText);
          setCachedAt(cached.cachedAt);
          setLoading(false);
          return;
        }
      }
      // 2. Fetch structured insights from backend
      const data = await fetchInsightsFromCloud(matchIndexes, currentSide);
      if (!data) {
        setError('No insights returned. Ensure the match is synced and try again.');
        setLoading(false);
        return;
      }
      if (data.error) {
        setError(data.error);
      }
      setInsights(data);

      // 3. Synthesis (LLM/Hybrid) — only if a key is present.
      let synthesized = null;
      const needsLLM = (currentMode === 'llm' || currentMode === 'hybrid') && currentKey;
      if (needsLLM && !data.error) {
        setGenerating(true);
        try {
          synthesized = (currentMode === 'llm')
            ? await writeFullReport(data, currentKey)
            : await synthesizeDiagnosis(data, currentKey);
          setLlmText(synthesized);
        } catch (e) {
          // LLM failure is non-fatal — fall back to deterministic Q7/Q8.
          setLlmText(null);
          Alert.alert('AI synthesis failed', `${e.message}\n\nShowing the rule-based report instead.`);
        } finally {
          setGenerating(false);
        }
      }
      setCachedAt(new Date().toISOString());
      await saveInsightsCache(matchIndexes, currentSide, currentMode, data, synthesized);
    } catch (e) {
      setError(e.message || 'Failed to load insights.');
    }
    setLoading(false);
  }, [matchIndexes]);

  const refresh = async () => {
    // Re-read settings so a mode/key change made in Settings is picked up.
    const s = await getSettings();
    setMode(s.analysisMode || DEFAULT_MODE);
    const activeKey = getActiveKey(s);
    setApiKey(activeKey);
    await load(s.analysisMode || DEFAULT_MODE, activeKey, side, true);
  };

  const switchSide = async (newSide) => {
    if (newSide === side) return;
    setSide(newSide);
    await load(mode, apiKey, newSide);
  };

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  // ─── Match meta for header + side toggle ──────────────────────────────────
  const matches = insights?.matches || [];
  const firstMatch = matches[0] || {};
  const side1Name = firstMatch.player1 || 'Player 1';
  const side2Name = firstMatch.player2 || 'Player 2';
  const subjectName = insights?.subject || (side === 'player1' ? side1Name : side2Name);
  const isMulti = matches.length > 1;

  const needsKeyBanner = (mode === 'llm' || mode === 'hybrid') && !apiKey;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Analyzing match data…</Text>
      </View>
    );
  }

  if (error && !insights) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={styles.errorTitle}>Insights Unavailable</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <HapticButton onPress={refresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </HapticButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </HapticButton>
        <Text style={styles.headerTitle} numberOfLines={1}>Insights Report</Text>
        <View style={styles.headerRight}>
          <HapticButton onPress={handleSharePdf(insights, llmText, mode, subjectName, matches)} style={styles.headerIconButton} disabled={!insights}>
            <Ionicons name="share-outline" size={22} color="#3B82F6" />
          </HapticButton>
          <HapticButton onPress={refresh} style={styles.headerIconButton} disabled={generating}>
            {generating
              ? <ActivityIndicator size="small" color="#3B82F6" />
              : <Ionicons name="refresh" size={22} color="#3B82F6" />}
          </HapticButton>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Match header */}
        <View style={styles.matchMetaHeader}>
          <Text style={styles.matchMetaTitle}>{subjectName}</Text>
          <Text style={styles.matchMetaSub}>
            {isMulti ? `${matches.length} matches · ` : ''}
            {mode === 'deterministic' ? 'Rules-based' : mode === 'hybrid' ? 'Hybrid (AI)' : 'LLM (AI)'} analysis
          </Text>
          {cachedAt ? (
            <Text style={styles.cachedAtText}>Generated {new Date(cachedAt).toLocaleString()}</Text>
          ) : null}
        </View>

        {/* Side toggle */}
        {!isMulti ? (
          <View style={styles.sideToggleRow}>
            <SideToggle
              active={side === 'player1'}
              label={side1Name}
              onPress={() => switchSide('player1')}
            />
            <SideToggle
              active={side === 'player2'}
              label={side2Name}
              onPress={() => switchSide('player2')}
            />
          </View>
        ) : null}

        {/* No-key banner */}
        {needsKeyBanner ? (
          <View style={styles.banner}>
            <Ionicons name="key-outline" size={16} color="#92400E" />
            <Text style={styles.bannerText}>
              {mode === 'llm' ? 'LLM' : 'Hybrid'} mode needs an API key. Showing the
              rule-based report — configure your AI settings in{' '}
              <Text style={styles.bannerLink} onPress={() => navigation.navigate('Settings')}>
                Settings
              </Text>{' '}
              to enable AI-written diagnosis.
            </Text>
          </View>
        ) : null}

        {generating ? (
          <View style={styles.banner}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.bannerText}>Generating AI analysis…</Text>
          </View>
        ) : null}

        {/* LLM full report mode: show the AI narrative as the primary content */}
        {mode === 'llm' && llmText ? (
          <Card style={styles.sectionCard}>
            <MarkdownBlock text={llmText} />
          </Card>
        ) : null}

        {/* Structured sections (always shown except in pure-LLM-with-text case) */}
        {!(mode === 'llm' && llmText) && insights ? (
          <>
            <Section title="1 · Serve Patterns" open={expanded.q1} onToggle={() => toggle('q1')}>
              <ServePatterns insights={insights} />
            </Section>

            <Section title="2 · Serve Strengths & Weaknesses" open={expanded.q2} onToggle={() => toggle('q2')}>
              <ServeStrengths insights={insights} />
            </Section>

            <Section title="3 · Baseline Strengths & Weaknesses" open={expanded.q3} onToggle={() => toggle('q3')}>
              <BaselineAnalysis insights={insights} />
            </Section>

            <Section title="4 · Net Game" open={expanded.q4} onToggle={() => toggle('q4')}>
              <NetGame insights={insights} />
            </Section>

            <Section title="5 · Momentum & Consistency" open={expanded.q5} onToggle={() => toggle('q5')}>
              {insights.q5_timeseries && insights.q5_timeseries.buckets
                ? <><MomentumChart buckets={insights.q5_timeseries.buckets} /><ConsistencyBlock ts={insights.q5_timeseries} /></>
                : <Text style={styles.thinText}>No time-series data available.</Text>}
            </Section>

            <Section title="6 · Clutch Performance" open={expanded.q6} onToggle={() => toggle('q6')}>
              <ClutchAnalysis insights={insights} />
            </Section>

            <Section title="7 · Why the Subject Won or Lost" open={expanded.q7} onToggle={() => toggle('q7')}>
              {llmText ? (
                <MarkdownBlock text={llmText} />
              ) : (
                <DiagnosisBlock diagnosis={insights.q7_diagnosis} />
              )}
            </Section>

            <Section title="8 · Recommendations" open={expanded.q8} onToggle={() => toggle('q8')}>
              {mode === 'llm' && llmText ? null : <RecommendationsBlock recs={insights.q8_recommendations} />}
            </Section>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── UI subcomponents ────────────────────────────────────────────────────────

function SideToggle({ active, label, onPress }) {
  return (
    <HapticButton
      onPress={onPress}
      style={[styles.sideToggleBtn, active && styles.sideToggleBtnActive]}
    >
      <Text style={[styles.sideToggleText, active && styles.sideToggleTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </HapticButton>
  );
}

function Section({ title, open, onToggle, children }) {
  return (
    <Card style={styles.sectionCard}>
      <TouchableOpacity onPress={onToggle} style={styles.accordionHeader} activeOpacity={0.65}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#4B5563" />
      </TouchableOpacity>
      {open ? <View style={styles.accordionContent}>{children}</View> : null}
    </Card>
  );
}

// Serve-direction stacked bar for one scenario {wide,body,t,...}
function ServeDirBar({ label, dist }) {
  const total = (dist.wide || 0) + (dist.body || 0) + (dist.t || 0);
  return (
    <View style={styles.serveDirRow}>
      <Text style={styles.serveDirLabel}>{label}</Text>
      <View style={styles.serveDirBar}>
        {total > 0 ? (
          <>
            <View style={{ flex: dist.wide || 0, height: 10, backgroundColor: SERVE_COLORS.wide }} />
            <View style={{ width: 2 }} />
            <View style={{ flex: dist.body || 0, height: 10, backgroundColor: SERVE_COLORS.body }} />
            <View style={{ width: 2 }} />
            <View style={{ flex: dist.t || 0, height: 10, backgroundColor: SERVE_COLORS.t }} />
          </>
        ) : (
          <View style={[styles.serveDirEmpty, { flex: 1 }]} />
        )}
      </View>
      <Text style={styles.serveDirN}>n={total}</Text>
      {dist.sufficient && dist.dominant ? (
        <Text style={styles.serveDirDominant}>
          {dist.dominant} {dist.dominantPct}%
        </Text>
      ) : total > 0 ? (
        <Text style={styles.serveDirThin}>thin</Text>
      ) : (
        <Text style={styles.serveDirThin}>—</Text>
      )}
    </View>
  );
}

function ServePatterns({ insights }) {
  const q1 = insights.q1_serve_patterns;
  const scenarios = [
    ['Overall', q1.firstServe.overall],
    ['Deuce side', q1.firstServe.deuce],
    ['Ad side', q1.firstServe.ad],
    ['High pressure', q1.firstServe.highPressure],
    ['Game point', q1.firstServe.gamePoint],
  ];
  const secondScenarios = [
    ['Overall', q1.secondServe.overall],
    ['Deuce side', q1.secondServe.deuce],
    ['Ad side', q1.secondServe.ad],
    ['High pressure', q1.secondServe.highPressure],
    ['Game point', q1.secondServe.gamePoint],
  ];
  return (
    <View>
      <Legend />
      <Text style={styles.subGroupLabel}>First serve</Text>
      {scenarios.map(([l, d]) => <ServeDirBar key={l} label={l} dist={d} />)}
      <Text style={styles.subGroupLabel}>Second serve</Text>
      {secondScenarios.map(([l, d]) => <ServeDirBar key={l} label={l} dist={d} />)}

      <Text style={styles.subGroupLabel}>Serve sequence (W/B/T by point)</Text>
      <Text style={styles.sequenceText}>1st · Deuce: {q1.sequence.firstDeuce || '—'}</Text>
      <Text style={styles.sequenceText}>1st · Ad:    {q1.sequence.firstAd || '—'}</Text>
      <Text style={styles.sequenceText}>2nd · Deuce: {q1.sequence.secondDeuce || '—'}</Text>
      <Text style={styles.sequenceText}>2nd · Ad:    {q1.sequence.secondAd || '—'}</Text>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legendRow}>
      <LegendDot color={SERVE_COLORS.wide} label="Wide" />
      <LegendDot color={SERVE_COLORS.body} label="Body" />
      <LegendDot color={SERVE_COLORS.t} label="T" />
    </View>
  );
}
function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function ServeStrengths({ insights }) {
  const q2 = insights.q2_serve;
  return (
    <View>
      <StatRow label="1st serve in" value={fmtPct(q2.firstServeInPct)} />
      <StatRow label="1st serve won" value={fmtPct(q2.firstServeWonPct)} />
      <StatRow label="2nd serve won" value={fmtPct(q2.secondServeWonPct)} />
      <StatRow label="Aces" value={String(q2.aces)} />
      <StatRow label="Double faults" value={String(q2.doubleFaults)} />
      <StatRow label="Unreturnable serves" value={String(q2.unreturnableServes)} />
      {q2.faultTendency.sufficient ? (
        <StatRow label="Fault tendency" value={`mostly ${q2.faultTendency.dominant} (${q2.faultTendency.net} net / ${q2.faultTendency.out} out)`} />
      ) : null}
      <TagList strengths={q2.strengths} weaknesses={q2.weaknesses} />
    </View>
  );
}

function BaselineAnalysis({ insights }) {
  const q3 = insights.q3_baseline;
  return (
    <View>
      <Text style={styles.subGroupLabel}>Unforced errors: {q3.unforcedErrors.total} (net {q3.unforcedErrors.net}, out {q3.unforcedErrors.out})</Text>
      {q3.unforcedErrors.byShot.filter((s) => s.n > 0).map((s) => (
        <View key={'ue' + s.shot} style={styles.shotRow}>
          <Text style={styles.shotLabel}>{s.shot}</Text>
          <View style={styles.shotBarTrack}>
            <View style={[styles.shotBarFill, { width: `${s.rate}%`, backgroundColor: WEAKNESS }]} />
          </View>
          <Text style={styles.shotN}>{s.n} ({s.rate}%)</Text>
        </View>
      ))}
      <Text style={[styles.subGroupLabel, { marginTop: 12 }]}>Winners & forced errors: {q3.winners.total}</Text>
      {q3.winners.byShot.filter((s) => s.n > 0).map((s) => (
        <View key={'w' + s.shot} style={styles.shotRow}>
          <Text style={styles.shotLabel}>{s.shot}</Text>
          <View style={styles.shotBarTrack}>
            <View style={[styles.shotBarFill, { width: `${s.rate}%`, backgroundColor: STRENGTH }]} />
          </View>
          <Text style={styles.shotN}>{s.n} ({s.rate}%)</Text>
        </View>
      ))}
      <TagList strengths={q3.strengths} weaknesses={q3.weaknesses} />
    </View>
  );
}

function NetGame({ insights }) {
  const q4 = insights.q4_net;
  return (
    <View>
      <StatRow label="Net points played" value={String(q4.netPointsPlayed)} />
      <StatRow label="Net points won" value={`${q4.netPointsWon}/${q4.netPointsPlayed} (${fmtPct(q4.netWinPct)})`} />
      <StatRow label="Volley (won / UE)" value={`${q4.volley.won} / ${q4.volley.unforcedErrors}`} />
      <StatRow label="Overhead (won / UE)" value={`${q4.overhead.won} / ${q4.overhead.unforcedErrors}`} />
      {q4.assessment ? (
        <View style={[styles.assessBox, q4.assessment.sufficient && q4.assessment.label.indexOf('Weak') !== -1 ? { backgroundColor: '#FEF2F2' } : q4.assessment.sufficient && q4.assessment.label.indexOf('Strong') !== -1 ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#F3F4F6' }]}>
          <Text style={styles.assessText}><Text style={styles.assessBold}>{q4.assessment.label}.</Text> {q4.assessment.evidence}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MomentumChart({ buckets }) {
  const data = buckets.filter((b) => !b.isSetMarker);
  const maxAbs = Math.max(1, ...data.map((b) => Math.abs(b.diff || 0)));
  const halfH = 50;
  return (
    <View>
      <View style={styles.momentumChart}>
        {data.map((b, i) => {
          const diff = b.diff || 0;
          const h = Math.round((Math.abs(diff) / maxAbs) * halfH);
          // Bug fix 4: diff===0 is neutral — show no bar on either side.
          const pos = diff > 0;
          const neg = diff < 0;
          return (
            <View key={i} style={styles.momentumCol}>
              <View style={{ height: halfH, justifyContent: 'flex-end', alignItems: 'center' }}>
                {pos ? <View style={{ width: 14, height: h, backgroundColor: MOMENTUM_POS, borderRadius: 3 }} /> : <View style={{ width: 14, height: 0 }} />}
              </View>
              <View style={styles.momentumAxis} />
              <View style={{ height: halfH, justifyContent: 'flex-start', alignItems: 'center' }}>
                {neg ? <View style={{ width: 14, height: h, backgroundColor: MOMENTUM_NEG, borderRadius: 3 }} /> : <View style={{ width: 14, height: 0 }} />}
              </View>
              <Text style={styles.momentumLabel}>{b.label.replace('G', '')}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={MOMENTUM_POS} label="Won more" />
        <LegendDot color={MOMENTUM_NEG} label="Lost more" />
      </View>
      <Text style={styles.chartHint}>Each column = ~4 games. Bars above the line = points won &gt; lost that stretch; below = lost &gt; won.</Text>
    </View>
  );
}

function ConsistencyBlock({ ts }) {
  return (
    <View>
      {ts.consistency.sufficient ? (
        <View style={styles.assessBox}>
          <Text style={styles.assessText}><Text style={styles.assessBold}>{ts.consistency.label}.</Text> Mean point differential {ts.consistency.mean}/bucket, variance {ts.consistency.variance}.</Text>
        </View>
      ) : (
        <Text style={styles.thinText}>Insufficient data to assess consistency ({ts.consistency.label}).</Text>
      )}
      {ts.stretches && ts.stretches.length > 0 ? (
        ts.stretches.map((s, i) => (
          <Text key={i} style={styles.stretchText}>• {s.type === 'better' ? 'Better stretch' : 'Worse stretch'} — {s.evidence}.</Text>
        ))
      ) : (
        <Text style={styles.thinText}>No significant better/worse stretches detected.</Text>
      )}
    </View>
  );
}

function ClutchAnalysis({ insights }) {
  const q6 = insights.q6_mental;
  return (
    <View>
      <StatRow label="High-pressure points won" value={`${q6.highPressure.won}/${q6.highPressure.won + q6.highPressure.lost} (${fmtPct(q6.highPressure.winPct)})`} />
      <StatRow label="HP on serve / return" value={`${q6.highPressure.onServe} / ${q6.highPressure.onReturn}`} />
      <StatRow label="HP first serve in" value={fmtPct(q6.highPressure.firstServeInPct)} />
      {q6.highPressure.ueRateUnderPressure !== null && q6.highPressure.ueRateOverall !== null ? (
        <StatRow label="Unforced-error rate" value={`${q6.highPressure.ueRateUnderPressure}% under pressure vs ${q6.highPressure.ueRateOverall}% overall`} />
      ) : null}
      <StatRow label="Break points" value={`${q6.breakPoints.won}/${q6.breakPoints.created} (${fmtPct(q6.breakPoints.convPct)})`} />
      <StatRow label="Game points" value={`${q6.gamePoints.won}/${q6.gamePoints.created} (${fmtPct(q6.gamePoints.convPct)})`} />
      {q6.assessment.length > 0 ? (
        <View style={styles.assessBox}>
          {q6.assessment.map((a, i) => (
            <Text key={i} style={styles.assessText}>• <Text style={styles.assessBold}>{a.label}.</Text> {a.evidence}</Text>
          ))}
        </View>
      ) : (
        <Text style={styles.thinText}>Insufficient high-pressure data for a clutch assessment.</Text>
      )}
    </View>
  );
}

function DiagnosisBlock({ diagnosis }) {
  return (
    <View>
      <Text style={styles.diagnosisSummary}>{diagnosis.summary}</Text>
      {diagnosis.factors.map((f, i) => (
        <View key={i} style={styles.factorRow}>
          <Text style={styles.factorLabel}>{f.label}</Text>
          <Text style={styles.factorEvidence}>{f.evidence}</Text>
        </View>
      ))}
    </View>
  );
}

function RecommendationsBlock({ recs }) {
  return (
    <View>
      {recs.map((r, i) => (
        <View key={i} style={styles.recCard}>
          <Text style={styles.recArea}>{r.area}</Text>
          <Text style={styles.recText}>{r.recommendation}</Text>
          <Text style={styles.recEvidence}>↳ {r.evidence}</Text>
        </View>
      ))}
    </View>
  );
}

function TagList({ strengths, weaknesses }) {
  if (!strengths.length && !weaknesses.length) {
    return <Text style={styles.thinText}>No standout strengths or weaknesses met the sample-size threshold.</Text>;
  }
  return (
    <View style={styles.tagList}>
      {strengths.map((s, i) => (
        <View key={'s' + i} style={[styles.tag, styles.tagStrength]}>
          <Ionicons name="trending-up" size={12} color={STRENGTH} />
          <Text style={styles.tagTextStrength}><Text style={styles.tagBold}>{s.label}.</Text> {s.evidence}</Text>
        </View>
      ))}
      {weaknesses.map((w, i) => (
        <View key={'w' + i} style={[styles.tag, styles.tagWeakness]}>
          <Ionicons name="trending-down" size={12} color={WEAKNESS} />
          <Text style={styles.tagTextWeakness}><Text style={styles.tagBold}>{w.label}.</Text> {w.evidence}</Text>
        </View>
      ))}
    </View>
  );
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// Tiny markdown renderer: ## headings -> bold section, else body line.
function MarkdownBlock({ text }) {
  const lines = (text || '').split('\n');
  return (
    <View style={styles.markdownBlock}>
      {lines.map((line, i) => {
        const m = line.match(/^#+\s*(.*)$/);
        if (m) {
          return <Text key={i} style={styles.mdHeading}>{m[1]}</Text>;
        }
        if (line.trim() === '') return <View key={i} style={{ height: 6 }} />;
        // strip simple ** bold markers
        const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1');
        return <Text key={i} style={styles.mdBody}>{cleaned}</Text>;
      })}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtPct(obj) {
  if (!obj) return '—';
  if (obj.value === null || obj.value === undefined) return '—';
  if (obj.sufficient === false) return `${obj.value}% (n=${obj.n ?? obj.d ?? '?'}, thin)`;
  return `${obj.value}% (${obj.n}/${obj.d})`;
}

// ─── PDF / share ─────────────────────────────────────────────────────────────
function handleSharePdf(insights, llmText, mode, subjectName, matches) {
  return async () => {
    if (!insights) {
      Alert.alert('No Report', 'Load the report first before sharing.');
      return;
    }
    try {
      const { uri: tmpUri } = await Print.printToFileAsync({
        html: buildReportHtml(insights, llmText, mode, subjectName, matches),
        base64: false,
      });
      let shareUri = tmpUri;
      try {
        const safe = (s) => (s || '').trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        const filename = `Insights_${safe(subjectName)}.pdf`;
        const dir = tmpUri.substring(0, tmpUri.lastIndexOf('/') + 1);
        const namedUri = dir + filename;
        await FileSystem.moveAsync({ from: tmpUri, to: namedUri });
        shareUri = namedUri;
      } catch (e) { /* fall back to temp uri */ }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', dialogTitle: 'Share Insights Report' });
      } else {
        Alert.alert('Sharing Unavailable', 'Your device does not support file sharing.');
      }
    } catch (e) {
      Alert.alert('PDF Failed', 'Could not generate the PDF report.');
    }
  };
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReportHtml(insights, llmText, mode, subjectName, matches) {
  const matchLine = matches.map((m) => `${esc(m.player1)} vs ${esc(m.player2)}${m.score ? ' · ' + esc(m.score) : ''}`).join('<br>');
  const llmSection = llmText
    ? `<div class="llm">${esc(llmText).replace(/\n/g, '<br>')}</div>`
    : '';

  const serveBars = (label, dist) => {
    const tot = (dist.wide || 0) + (dist.body || 0) + (dist.t || 0);
    if (!tot) return '';
    const pct = (n) => Math.round((n / tot) * 100);
    return `<div class="sbar"><span class="sl">${esc(label)}</span>
      <div class="strack">
        <div class="seg w" style="width:${pct(dist.wide)}%"></div>
        <div class="seg b" style="width:${pct(dist.body)}%"></div>
        <div class="seg t" style="width:${pct(dist.t)}%"></div>
      </div><span class="sn">n=${tot}</span></div>`;
  };

  const firstServe = ['Overall','Deuce','Ad','High pressure','Game point']
    .map((l, i) => serveBars(l, [insights.q1_serve_patterns.firstServe.overall, insights.q1_serve_patterns.firstServe.deuce, insights.q1_serve_patterns.firstServe.ad, insights.q1_serve_patterns.firstServe.highPressure, insights.q1_serve_patterns.firstServe.gamePoint][i]))
    .join('');

  const secondServe = ['Overall','Deuce','Ad','High pressure','Game point']
    .map((l, i) => serveBars(l, [insights.q1_serve_patterns.secondServe.overall, insights.q1_serve_patterns.secondServe.deuce, insights.q1_serve_patterns.secondServe.ad, insights.q1_serve_patterns.secondServe.highPressure, insights.q1_serve_patterns.secondServe.gamePoint][i]))
    .join('');

  const q1 = insights.q1_serve_patterns;
  const seqHtml = `
    <div style="font-size:11px; margin-top:8px; line-height: 1.6; font-family:monospace; background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0;">
      <b>Serve sequences (W/B/T by point):</b><br>
      1st · Deuce: ${esc(q1.sequence.firstDeuce || '—')}<br>
      1st · Ad:    ${esc(q1.sequence.firstAd || '—')}<br>
      2nd · Deuce: ${esc(q1.sequence.secondDeuce || '—')}<br>
      2nd · Ad:    ${esc(q1.sequence.secondAd || '—')}
    </div>
  `;

  const buildTagListHtml = (strengths, weaknesses) => {
    if (!strengths.length && !weaknesses.length) {
      return `<div class="thin-txt">No standout strengths or weaknesses met the sample-size threshold.</div>`;
    }
    const strHtml = strengths.map(s => `<div class="tag str">▲ <b>${esc(s.label)}.</b> ${esc(s.evidence)}</div>`).join('');
    const weakHtml = weaknesses.map(w => `<div class="tag weak">▼ <b>${esc(w.label)}.</b> ${esc(w.evidence)}</div>`).join('');
    return `<div class="tag-list">${strHtml}${weakHtml}</div>`;
  };

  const q2 = insights.q2_serve;
  const serveStrengthsHtml = `
    <table class="tbl">
      <tr><td>1st serve in</td><td class="val">${esc(fmtPct(q2.firstServeInPct))}</td></tr>
      <tr><td>1st serve won</td><td class="val">${esc(fmtPct(q2.firstServeWonPct))}</td></tr>
      <tr><td>2nd serve won</td><td class="val">${esc(fmtPct(q2.secondServeWonPct))}</td></tr>
      <tr><td>Aces</td><td class="val">${esc(q2.aces)}</td></tr>
      <tr><td>Double faults</td><td class="val">${esc(q2.doubleFaults)}</td></tr>
      <tr><td>Unreturnable serves</td><td class="val">${esc(q2.unreturnableServes)}</td></tr>
      ${q2.faultTendency.sufficient ? `<tr><td>Fault tendency</td><td class="val">mostly ${esc(q2.faultTendency.dominant)} (${esc(q2.faultTendency.net)} net / ${esc(q2.faultTendency.out)} out)</td></tr>` : ''}
    </table>
    ${buildTagListHtml(q2.strengths, q2.weaknesses)}
  `;

  const q3 = insights.q3_baseline;
  const ueRows = q3.unforcedErrors.byShot.filter(s => s.n > 0).map(s => `
    <div class="shot-row">
      <span class="shot-lbl">${esc(s.shot)}</span>
      <div class="shot-track">
        <div class="shot-fill ue" style="width:${s.rate}%"></div>
      </div>
      <span class="shot-n">${esc(s.n)} (${esc(s.rate)}%)</span>
    </div>
  `).join('');
  
  const winRows = q3.winners.byShot.filter(s => s.n > 0).map(s => `
    <div class="shot-row">
      <span class="shot-lbl">${esc(s.shot)}</span>
      <div class="shot-track">
        <div class="shot-fill win" style="width:${s.rate}%"></div>
      </div>
      <span class="shot-n">${esc(s.n)} (${esc(s.rate)}%)</span>
    </div>
  `).join('');

  const baselineHtml = `
    <div style="font-size:12px; font-weight:700; margin-top:6px; color:#4B5563;">Unforced errors: ${q3.unforcedErrors.total} (net ${q3.unforcedErrors.net}, out ${q3.unforcedErrors.out})</div>
    ${ueRows || '<div class="thin-txt">No unforced errors recorded.</div>'}
    <div style="font-size:12px; font-weight:700; margin-top:10px; color:#4B5563;">Winners & forced errors: ${q3.winners.total}</div>
    ${winRows || '<div class="thin-txt">No winners recorded.</div>'}
    ${buildTagListHtml(q3.strengths, q3.weaknesses)}
  `;

  const q4 = insights.q4_net;
  const netGameHtml = `
    <table class="tbl">
      <tr><td>Net points played</td><td class="val">${esc(q4.netPointsPlayed)}</td></tr>
      <tr><td>Net points won</td><td class="val">${esc(q4.netPointsWon)}/${esc(q4.netPointsPlayed)} (${esc(fmtPct(q4.netWinPct))})</td></tr>
      <tr><td>Volley (won / UE)</td><td class="val">${esc(q4.volley.won)} / ${esc(q4.volley.unforcedErrors)}</td></tr>
      <tr><td>Overhead (won / UE)</td><td class="val">${esc(q4.overhead.won)} / ${esc(q4.overhead.unforcedErrors)}</td></tr>
    </table>
    ${q4.assessment ? `
      <div class="assess-box" style="${q4.assessment.sufficient && q4.assessment.label.indexOf('Weak') !== -1 ? 'background-color: #FEF2F2; color: #991B1B;' : q4.assessment.sufficient && q4.assessment.label.indexOf('Strong') !== -1 ? 'background-color: #ECFDF5; color: #065F46;' : 'background-color: #F3F4F6;'}">
        <span class="assess-bold">${esc(q4.assessment.label)}.</span> ${esc(q4.assessment.evidence)}
      </div>
    ` : ''}
  `;

  const buckets = (insights.q5_timeseries.buckets || []).filter((b) => !b.isSetMarker);
  const maxAbs = Math.max(1, ...buckets.map((b) => Math.abs(b.diff || 0)));
  const momentum = buckets.map((b) => {
    const h = Math.round((Math.abs(b.diff || 0) / maxAbs) * 40);
    const pos = (b.diff || 0) >= 0;
    return `<div class="mcol"><div class="mtop">${pos ? `<div class="mbar pos" style="height:${h}px"></div>` : ''}</div><div class="mline"></div><div class="mbot">${!pos ? `<div class="mbar neg" style="height:${h}px"></div>` : ''}</div><div class="mlab">${esc(b.label).replace('G','')}</div></div>`;
  }).join('');

  const ts = insights.q5_timeseries;
  const consistencyHtml = `
    ${ts.consistency.sufficient ? `
      <div class="assess-box">
        <span class="assess-bold">${esc(ts.consistency.label)}.</span> Mean point differential ${esc(ts.consistency.mean)}/bucket, variance ${esc(ts.consistency.variance)}.
      </div>
    ` : `<div class="thin-txt">Insufficient data to assess consistency (${esc(ts.consistency.label)}).</div>`}
    
    ${ts.stretches && ts.stretches.length > 0 ? ts.stretches.map(s => `
      <div style="font-size:11px; margin-top:4px; color:#374151;">• <b>${s.type === 'better' ? 'Better stretch' : 'Worse stretch'}</b> — ${esc(s.evidence)}.</div>
    `).join('') : '<div class="thin-txt">No significant better/worse stretches detected.</div>'}
  `;

  const q6 = insights.q6_mental;
  const clutchHtml = `
    <table class="tbl">
      <tr><td>High-pressure points won</td><td class="val">${esc(q6.highPressure.won)}/${esc(q6.highPressure.won + q6.highPressure.lost)} (${esc(fmtPct(q6.highPressure.winPct))})</td></tr>
      <tr><td>HP on serve / return</td><td class="val">${esc(q6.highPressure.onServe)} / ${esc(q6.highPressure.onReturn)}</td></tr>
      <tr><td>HP first serve in</td><td class="val">${esc(fmtPct(q6.highPressure.firstServeInPct))}</td></tr>
      ${q6.highPressure.ueRateUnderPressure !== null && q6.highPressure.ueRateOverall !== null ? `
        <tr><td>Unforced-error rate</td><td class="val">${esc(q6.highPressure.ueRateUnderPressure)}% under pressure vs ${esc(q6.highPressure.ueRateOverall)}% overall</td></tr>
      ` : ''}
      <tr><td>Break points</td><td class="val">${esc(q6.breakPoints.won)}/${esc(q6.breakPoints.created)} (${esc(fmtPct(q6.breakPoints.convPct))})</td></tr>
      <tr><td>Game points</td><td class="val">${esc(q6.gamePoints.won)}/${esc(q6.gamePoints.created)} (${esc(fmtPct(q6.gamePoints.convPct))})</td></tr>
    </table>
    ${q6.assessment.length > 0 ? `
      <div class="assess-box" style="background-color: #F8FAFC; border: 1px solid #E2E8F0;">
        ${q6.assessment.map(a => `<div style="margin-top:2px;">• <span class="assess-bold">${esc(a.label)}.</span> ${esc(a.evidence)}</div>`).join('')}
      </div>
    ` : `<div class="thin-txt">Insufficient high-pressure data for a clutch assessment.</div>`}
  `;

  const factors = (insights.q7_diagnosis.factors || [])
    .map((f) => `<div style="padding: 6px 0; border-bottom: 1px solid #F0F0F0;"><div style="font-size:12px; font-weight:700; color:#1E293B;">${esc(f.label)}</div><div style="font-size:11px; color:#4B5563; margin-top:2px;">${esc(f.evidence)}</div></div>`)
    .join('');

  const recsHtml = (insights.q8_recommendations || [])
    .map((r) => `
      <div class="rec-card">
        <div class="rec-area">${esc(r.area)}</div>
        <div class="rec-txt">${esc(r.recommendation)}</div>
        <div class="rec-ev">↳ ${esc(r.evidence)}</div>
      </div>
    `)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;margin:0;padding:20px;color:#111827}
    .card{background:#fff;border-radius:10px;padding:16px;margin-bottom:14px}
    h1{font-size:20px;margin:0 0 4px} .sub{color:#6B7280;font-size:12px;margin-bottom:12px}
    h2{font-size:14px;color:#2d4a8a;margin:14px 0 8px;border-bottom:1px solid #E5E7EB;padding-bottom:4px}
    .llm{font-size:13px;line-height:18px;white-space:pre-wrap}
    ul{font-size:13px;line-height:18px}
    
    .sbar{display:flex;align-items:center;gap:8px;margin:4px 0}
    .sl{width:90px;font-size:11px;color:#374151}
    .strack{flex:1;height:12px;background:#F3F4F6;border-radius:6px;display:flex;overflow:hidden}
    .seg{height:12px}.w{background:#3B82F6}.b{background:#F59E0B}.t{background:#10B981}
    .sn{font-size:11px;color:#9CA3AF;width:34px}
    
    .shot-row { display: flex; align-items: center; margin: 5px 0; gap: 8px; }
    .shot-lbl { width: 80px; font-size: 11px; text-transform: capitalize; color: #374151; }
    .shot-track { flex: 1; height: 8px; background: #F3F4F6; border-radius: 4px; display: flex; }
    .shot-fill { height: 8px; border-radius: 4px; }
    .shot-fill.ue { background: #EF4444; }
    .shot-fill.win { background: #10B981; }
    .shot-n { font-size: 11px; color: #6B7280; width: 64px; text-align: right; }
    
    .tag-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    .tag { display: flex; align-items: flex-start; gap: 6px; border-radius: 6px; padding: 6px 10px; font-size: 11px; }
    .tag.str { background: #ECFDF5; color: #065F46; border-left: 3px solid #10B981; }
    .tag.weak { background: #FEF2F2; color: #991B1B; border-left: 3px solid #EF4444; }
    
    .assess-box { background: #F3F4F6; border-radius: 8px; padding: 10px; margin-top: 8px; font-size: 11px; line-height: 1.4; color: #374151; }
    .assess-bold { font-weight: 700; color: #1F2937; }
    .thin-txt { font-size: 11px; color: #9CA3AF; font-style: italic; margin-top: 6px; }
    
    .tbl { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 6px; }
    .tbl td { padding: 5px 0; font-size: 12px; border-bottom: 1px solid #F0F0F0; color: #374151; }
    .tbl td.val { text-align: right; font-weight: 700; color: #111827; }
    
    .rec-card { background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; padding: 8px 10px; margin-bottom: 8px; font-size: 11px; }
    .rec-area { font-weight: 800; color: #3B82F6; text-transform: uppercase; margin-bottom: 2px; }
    .rec-txt { color: #1E293B; line-height: 1.4; }
    .rec-ev { color: #64748B; font-style: italic; margin-top: 2px; }
    
    .mwrap{display:flex;align-items:flex-end;gap:3px;height:90px;margin:8px 0}
    .mcol{flex:1;display:flex;flex-direction:column;align-items:center}
    .mtop,.mbot{height:40px;width:100%;display:flex;justify-content:center;align-items:flex-end}
    .mbot{align-items:flex-start}
    .mbar{width:16px;border-radius:3px}.pos{background:#10B981}.neg{background:#EF4444}
    .mline{width:100%;height:1px;background:#D1D5DB}
    .mlab{font-size:9px;color:#9CA3AF;margin-top:2px}
    .leg{font-size:11px;color:#6B7280;margin:6px 0}
  </style></head><body>
  <div class="card"><h1>${esc(subjectName)} — Insights Report</h1><div class="sub">${matchLine}<br>${mode} mode</div></div>
  ${llmSection ? `<div class="card"><h2>AI Analysis</h2><div class="llm">${esc(llmText).replace(/\n/g,'<br>')}</div></div>` : ''}
  
  ${!(mode === 'llm' && llmText) ? `
    <div class="card">
      <h2>1 · Serve Patterns</h2>
      <div style="font-size: 12px; font-weight:700; color:#4B5563; margin-top:8px;">First serve</div>
      ${firstServe || '<div class="thin-txt">No first serve data.</div>'}
      <div style="font-size: 12px; font-weight:700; color:#4B5563; margin-top:12px;">Second serve</div>
      ${secondServe || '<div class="thin-txt">No second serve data.</div>'}
      <div class="leg"><span style="color:#3B82F6">■</span> Wide &nbsp; <span style="color:#F59E0B">■</span> Body &nbsp; <span style="color:#10B981">■</span> T</div>
      ${seqHtml}
    </div>
    
    <div class="card">
      <h2>2 · Serve Strengths & Weaknesses</h2>
      ${serveStrengthsHtml}
    </div>
    
    <div class="card">
      <h2>3 · Baseline Strengths & Weaknesses</h2>
      ${baselineHtml}
    </div>
    
    <div class="card">
      <h2>4 · Net Game</h2>
      ${netGameHtml}
    </div>
    
    <div class="card">
      <h2>5 · Momentum & Consistency</h2>
      <div class="mwrap">${momentum}</div>
      <div class="leg"><span style="color:#10B981">■</span> Won more &nbsp; <span style="color:#EF4444">■</span> Lost more</div>
      ${consistencyHtml}
    </div>
    
    <div class="card">
      <h2>6 · Clutch Performance</h2>
      ${clutchHtml}
    </div>
  ` : ''}
  
  <div class="card">
    <h2>7 · Why the subject won or lost</h2>
    ${llmText ? `<div class="llm">${esc(llmText).replace(/\n/g,'<br>')}</div>` : `<p style="font-size:12px; font-weight:700; color:#1F2937; line-height:1.5;">${esc(insights.q7_diagnosis.summary)}</p>${factors}`}
  </div>
  
  ${(mode === 'llm' && llmText) ? '' : `<div class="card"><h2>8 · Recommendations</h2>${recsHtml}</div>`}
  
  <div class="leg" style="text-align:center; margin-top: 20px; font-size: 10px;">Generated by Tennis Analyzer</div>
  </body></html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderColor: '#E5E7EB',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 14, fontSize: 14, color: '#4B5563' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#F9FAFB' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  errorSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  retryButton: { backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 40 },
  matchMetaHeader: { marginBottom: 10, paddingLeft: 4 },
  matchMetaTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  matchMetaSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cachedAtText: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },
  sideToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sideToggleBtn: { flex: 1, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sideToggleBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  sideToggleText: { color: '#4B5563', fontWeight: '700', fontSize: 13 },
  sideToggleTextActive: { color: '#FFFFFF' },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, gap: 8, marginBottom: 12 },
  bannerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 16 },
  bannerLink: { fontWeight: '700', textDecorationLine: 'underline' },
  sectionCard: { padding: 0, overflow: 'hidden', marginBottom: 10 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#FFFFFF' },
  accordionContent: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FCFDFE' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  subGroupLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8, marginBottom: 4 },
  // serve dir bar
  serveDirRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  serveDirLabel: { width: 92, fontSize: 12, color: '#374151' },
  serveDirBar: { flex: 1, flexDirection: 'row', height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  serveDirEmpty: { backgroundColor: '#E5E7EB' },
  serveDirN: { fontSize: 10, color: '#9CA3AF', width: 34 },
  serveDirDominant: { fontSize: 11, fontWeight: '700', color: '#1E293B', width: 64, textAlign: 'right' },
  serveDirThin: { fontSize: 10, color: '#9CA3AF', width: 64, textAlign: 'right', fontStyle: 'italic' },
  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 6, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: '#4B5563' },
  sequenceText: { fontSize: 11, color: '#475569', fontFamily: 'monospace', lineHeight: 16 },
  // stat rows
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F0F0F0' },
  statLabel: { fontSize: 12, color: '#374151', flex: 1 },
  statValue: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'right' },
  // shot bars
  shotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: 8 },
  shotLabel: { width: 76, fontSize: 11, color: '#374151', textTransform: 'capitalize' },
  shotBarTrack: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, flexDirection: 'row' },
  shotBarFill: { height: 8, borderRadius: 4 },
  shotN: { width: 64, fontSize: 10, color: '#6B7280', textAlign: 'right' },
  // tags
  tagList: { marginTop: 8, gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: 8, padding: 8 },
  tagStrength: { backgroundColor: '#ECFDF5' },
  tagWeakness: { backgroundColor: '#FEF2F2' },
  tagTextStrength: { flex: 1, fontSize: 11, color: '#065F46', lineHeight: 15 },
  tagTextWeakness: { flex: 1, fontSize: 11, color: '#991B1B', lineHeight: 15 },
  tagBold: { fontWeight: '700' },
  // assess
  assessBox: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, marginTop: 8 },
  assessText: { fontSize: 11, color: '#374151', lineHeight: 15, marginBottom: 3 },
  assessBold: { fontWeight: '700', color: '#1F2937' },
  thinText: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginTop: 6, lineHeight: 15 },
  // momentum
  momentumChart: { flexDirection: 'row', alignItems: 'stretch', gap: 4, marginTop: 6, paddingHorizontal: 2 },
  momentumCol: { flex: 1, alignItems: 'center' },
  momentumAxis: { width: '100%', height: 1, backgroundColor: '#CBD5E1' },
  momentumLabel: { fontSize: 8, color: '#9CA3AF', marginTop: 2 },
  chartHint: { fontSize: 10, color: '#9CA3AF', marginTop: 8, lineHeight: 14 },
  stretchText: { fontSize: 11, color: '#374151', marginTop: 4, lineHeight: 15 },
  // diagnosis
  diagnosisSummary: { fontSize: 13, fontWeight: '700', color: '#1F2937', lineHeight: 18, marginBottom: 10 },
  factorRow: { paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F0F0F0' },
  factorLabel: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  factorEvidence: { fontSize: 12, color: '#4B5563', marginTop: 2, lineHeight: 16 },
  // recs
  recCard: { backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, marginBottom: 8 },
  recArea: { fontSize: 10, fontWeight: '800', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  recText: { fontSize: 12, color: '#1E293B', lineHeight: 17 },
  recEvidence: { fontSize: 10, color: '#64748B', marginTop: 4, fontStyle: 'italic' },
  // markdown
  markdownBlock: { paddingVertical: 4 },
  mdHeading: { fontSize: 14, fontWeight: '800', color: '#1F2937', marginTop: 10, marginBottom: 4 },
  mdBody: { fontSize: 12, color: '#334155', lineHeight: 18 },
});
