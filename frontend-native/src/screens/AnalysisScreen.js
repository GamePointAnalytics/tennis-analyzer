import React, { useState, useEffect } from 'react';
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
import { getMatch } from '../database/db';
import { getAnalysisCache, saveAnalysisCache } from '../database/db';
import { fetchAnalysisFromCloud } from '../utils/api';

// ─── Parsing utilities ───────────────────────────────────────────────
// Backend strings follow the pattern:
//   "PlayerName: label1(value1), label2(value2, or N percent), ..."
// This parser turns that into structured data.

/**
 * Strip HTML tags and convert <br> to newlines.
 */
const stripHtml = (htmlStr) => {
  if (!htmlStr) return '';
  return String(htmlStr)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+percent\b/gi, '%')
    .trim();
};

/**
 * Parse a backend paragraph string into { player, items: [{ label, value }] }.
 * Handles formats like:
 *   "Name: label(val), label(val, or N percent)"
 *   "Name: label(sub1 N, sub2 N, sub3 N)"
 */
const parseStatString = (raw, playerNames = []) => {
  const str = stripHtml(raw);
  if (!str) return null;

  // Split "PlayerName: rest..."
  const colonIdx = str.indexOf(':');

  // Helper: parse a list of label(value) segments from a body string
  const parseBody = (body) => {
    const items = [];
    const segments = body.split(/\),\s*/);

    for (let seg of segments) {
      seg = seg.trim();
      if (!seg) continue;
      seg = seg.replace(/,\s*$/, '').replace(/\)$/, '');

      // Handle "(category) rest-of-label(value)" — backend wraps category name in parens
      // e.g. "(1-5 shot) played on serve(108, won 68, ...)" should become
      // label="1-5 shot – played on serve", value="108, won 68, ..."
      let catPrefix = '';
      let workSeg = seg;
      if (workSeg.startsWith('(')) {
        const closeIdx = workSeg.indexOf(')');
        if (closeIdx !== -1) {
          catPrefix = workSeg.substring(1, closeIdx).trim();
          workSeg = workSeg.substring(closeIdx + 1).trim();
        }
      }

      const parenIdx = workSeg.indexOf('(');
      if (parenIdx === -1) {
        // No value paren — treat remaining text as label (category becomes value)
        const label = catPrefix && workSeg ? `${catPrefix} – ${workSeg}` : (catPrefix || workSeg);
        if (label) items.push({ label, value: '' });
      } else {
        const rawLabel = workSeg.substring(0, parenIdx).trim();
        const value = workSeg.substring(parenIdx + 1).replace(/\)$/, '').trim();
        const label = catPrefix && rawLabel ? `${catPrefix} – ${rawLabel}` : (catPrefix || rawLabel);
        items.push({ label, value });
      }
    }
    return items;
  };

  // If no colon, the string has no player prefix.
  // Special case: double_fault fields use "PlayerName label(value), ..." (space, no colon).
  // Try to detect a known player name at the start of the string.
  if (colonIdx === -1) {
    const strLower = str.toLowerCase();
    for (const name of playerNames) {
      if (!name) continue;
      const nameLower = name.trim().toLowerCase();
      if (strLower.startsWith(nameLower)) {
        const player = str.substring(0, name.trim().length).trim();
        const body = str.substring(name.trim().length).trim();
        return { player, items: parseBody(body) };
      }
    }
    // No player name match — parse all label(value) pairs directly
    return { player: '', items: parseBody(str) };
  }

  const player = str.substring(0, colonIdx).trim();
  const body = str.substring(colonIdx + 1).trim();

  return { player, items: parseBody(body) };
};

/**
 * Extract the first parenthesized number from a stat string.
 * e.g. "Name: total points won(51), ..." → "51"
 */
const extractHeadlineNumber = (raw) => {
  const str = stripHtml(raw);
  if (!str) return '';
  // Skip past any leading (category) prefix like "(1-5 shot)" before looking for a value paren.
  // Strategy: find all (number...) matches and return the first one that isn't a category tag.
  const matches = [...str.matchAll(/\(([^)]*)/g)];
  for (const m of matches) {
    const inner = m[1].trim();
    // Skip category prefixes: "1-5 shot", "6-9 shot", "10+ shot" etc.
    if (/^[\d+\-]+\s+\w/.test(inner)) continue;
    // Extract leading digits from the value
    const numMatch = inner.match(/^(\d+)/);
    if (numMatch) return numMatch[1];
  }
  // Fallback: if the whole string is just a plain number, return it directly
  const plain = str.trim();
  if (/^\d+$/.test(plain)) return plain;
  return '';
};

/**
 * Extract a percentage from a string.
 * After stripHtml, "68 percent" has become "68%", so we match that.
 * e.g. "Name: first serve percentage(68%)" → "68%"
 */
const extractHeadlinePct = (raw) => {
  const str = stripHtml(raw);
  if (!str) return '';
  // Match "(N%)" or "(N %)"
  const m = str.match(/\((\d+)\s*%/);
  return m ? `${m[1]}%` : '';
};

/**
 * Extract the Nth percentage match from a raw string (0-indexed).
 * Useful when the backend merges both players' data into one field.
 * e.g. idx=1 returns the second "(N%)" found in the string.
 */
const extractNthPct = (raw, idx) => {
  const str = stripHtml(raw);
  if (!str) return '';
  const matches = [...str.matchAll(/\((\d+)\s*%/g)];
  return (matches[idx]) ? `${matches[idx][1]}%` : '';
};

/**
 * Extract the Nth headline number from a raw string (0-indexed).
 */
const extractNthNumber = (raw, idx) => {
  const str = stripHtml(raw);
  if (!str) return '';
  const matches = [...str.matchAll(/\(([^)]*)/g)];
  let found = 0;
  for (const m of matches) {
    const inner = m[1].trim();
    if (/^[\d+\-]+\s+\w/.test(inner)) continue;
    const numMatch = inner.match(/^(\d+)/);
    if (numMatch) {
      if (found === idx) return numMatch[1];
      found++;
    }
  }
  return '';
};

/**
 * Extract a percentage for a player, with fallback to the combined field.
 * If raw2 has data, extract from it. Otherwise try the 2nd pct in raw1.
 */
const extractPctWithFallback = (raw1, raw2) => {
  const direct = extractHeadlinePct(raw2);
  if (direct) return direct;
  // Fallback: try 2nd percentage in raw1 (both players merged into one field)
  return extractNthPct(raw1, 1);
};

/**
 * Extract a headline number for a player, with fallback to the combined field.
 */
const extractNumWithFallback = (raw1, raw2) => {
  const direct = extractHeadlineNumber(raw2);
  if (direct) return direct;
  return extractNthNumber(raw1, 1);
};

/**
 * Format a raw date string (e.g. "2023-07-08T04:00:00.000Z") into a
 * human-friendly form (e.g. "8 Jul 2023"). Falls back to the raw string
 * if the value isn't a parseable date.
 */
const formatMatchDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
};

export default function AnalysisScreen({ route, navigation }) {
  const { matchIndex } = route.params;

  const [match, setMatch] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);     // initial load (no cache)
  const [refreshing, setRefreshing] = useState(false); // ↺ button in-flight
  const [cachedAt, setCachedAt] = useState(null);   // ISO string of last fetch
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    serve: false,
    rally: false,
    pressure: false,
    errors: false
  });

  useEffect(() => {
    loadFromCacheOrCloud();
  }, [matchIndex]);

  // On mount: show cached data instantly if available; fetch from cloud only when no cache.
  const loadFromCacheOrCloud = async () => {
    setLoading(true);
    try {
      const matchData = await getMatch(matchIndex);
      setMatch(matchData);

      const cached = await getAnalysisCache(matchIndex);
      if (cached) {
        // Cache hit — show immediately, no cloud call
        setAnalysis(cached.data);
        setCachedAt(cached.cachedAt);
        setLoading(false);
        return;
      }

      // No cache yet — fetch from cloud
      const analysisData = await fetchAnalysisFromCloud(matchIndex);
      if (analysisData) {
        setAnalysis(analysisData);
        const now = new Date().toISOString();
        setCachedAt(now);
        await saveAnalysisCache(matchIndex, analysisData);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Cloud Query Failed',
        'Could not fetch analysis from the cloud. Ensure your Apps Script URL is correct, the script is deployed, and the device has internet access.'
      );
    }
    setLoading(false);
  };

  // Manual refresh: always fetch fresh from cloud and update cache.
  const refreshFromCloud = async () => {
    setRefreshing(true);
    try {
      const analysisData = await fetchAnalysisFromCloud(matchIndex);
      if (analysisData) {
        setAnalysis(analysisData);
        const now = new Date().toISOString();
        setCachedAt(now);
        await saveAnalysisCache(matchIndex, analysisData);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Cloud Query Failed',
        'Could not fetch analysis from the cloud. Ensure your Apps Script URL is correct, the script is deployed, and the device has internet access.'
      );
    }
    setRefreshing(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ─── Email / Share ───────────────────────────────────────────────

  const formatReportAsHtml = () => {
    // Inline styles are required for email clients (Gmail strips <style> blocks)
    const colors = {
      bg:        '#f4f6f9',
      card:      '#ffffff',
      header:    '#1a2744',
      accent:    '#3B82F6',
      section:   '#2d4a8a',
      label:     '#374151',
      value:     '#111827',
      border:    '#e5e7eb',
      subhead:   '#6B7280',
      green:     '#059669',
    };

    const dateStr = (() => {
      if (!match.date) return '';
      const d = new Date(match.date);
      if (isNaN(d.getTime())) return match.date;
      return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    })();

    // Render a parsed stat block as an HTML table
    const statTable = (raw) => {
      const parsed = parseStatString(raw);
      if (!parsed || !parsed.items.length) return '';
      let rows = '';
      for (const item of parsed.items) {
        if (!item.label && !item.value) continue;
        rows += `
          <tr>
            <td style="padding:5px 12px 5px 0;color:${colors.label};font-size:13px;width:65%;vertical-align:top;word-break:break-word;">${item.label}</td>
            <td style="padding:5px 0;color:${colors.value};font-size:13px;font-weight:600;text-align:right;width:35%;vertical-align:top;word-break:break-word;">${item.value}</td>
          </tr>`;
      }
      if (!rows) return '';
      return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rows}</table>`;
    };

    // Render a stacked player-split section
    const stackedSection = (title, raw1, raw2) => {
      const p1 = parseStatString(raw1);
      const p2 = parseStatString(raw2);
      if (!p1 && !p2) return '';
      let html = `<tr><td colspan="2" style="padding:12px 0 4px;font-size:12px;font-weight:700;color:${colors.subhead};text-transform:uppercase;letter-spacing:0.5px;">${title}</td></tr>`;
      if (p1 && p1.items.length) {
        html += `<tr><td colspan="2" style="padding:2px 0 0;">
          <div style="background:${colors.bg};border-radius:6px;padding:8px 10px;margin-bottom:6px;">
            <div style="font-size:12px;font-weight:700;color:${colors.accent};margin-bottom:4px;">${p1.player || match.player1}</div>
            ${statTable(raw1)}
          </div></td></tr>`;
      }
      if (p2 && p2.items.length) {
        html += `<tr><td colspan="2" style="padding:2px 0 6px;">
          <div style="background:${colors.bg};border-radius:6px;padding:8px 10px;">
            <div style="font-size:12px;font-weight:700;color:${colors.green};margin-bottom:4px;">${p2.player || match.player2}</div>
            ${statTable(raw2)}
          </div></td></tr>`;
      }
      return html;
    };

    // Render a single (non-split) section
    const singleSection = (title, raw) => {
      const parsed = parseStatString(raw);
      if (!parsed || !parsed.items.length) return '';
      return `<tr><td colspan="2" style="padding:12px 0 4px;font-size:12px;font-weight:700;color:${colors.subhead};text-transform:uppercase;letter-spacing:0.5px;">${title}</td></tr>
        <tr><td colspan="2" style="padding:2px 0 6px;">
          <div style="background:${colors.bg};border-radius:6px;padding:8px 10px;">
            ${statTable(raw)}
          </div></td></tr>`;
    };

    // Section wrapper with colored header bar
    const section = (title, innerHtml) => {
      if (!innerHtml.trim()) return '';
      return `
        <tr><td colspan="2" style="padding-top:20px;">
          <div style="background:${colors.section};color:#fff;font-size:14px;font-weight:700;padding:8px 14px;border-radius:6px 6px 0 0;letter-spacing:0.3px;">${title}</div>
          <div style="border:1px solid ${colors.border};border-top:none;border-radius:0 0 6px 6px;padding:8px 14px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              ${innerHtml}
            </table>
          </div>
        </td></tr>`;
    };

    const scoreText = stripHtml(analysis.score || '');

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${colors.bg};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colors.bg};padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:${colors.header};border-radius:10px 10px 0 0;padding:24px 24px 20px;text-align:center;">
          <div style="color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Tennis Match Analysis</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-bottom:6px;">${match.player1} vs ${match.player2}</div>
          <div style="color:#cbd5e1;font-size:13px;">${match.tournament ? match.tournament + ' &nbsp;·&nbsp; ' : ''}${dateStr}</div>
          ${scoreText ? `<div style="margin-top:14px;background:rgba(59,130,246,0.25);border:1px solid rgba(59,130,246,0.5);border-radius:6px;padding:8px 16px;color:#bfdbfe;font-size:14px;font-weight:700;">Final Score: ${scoreText}</div>` : ''}
        </td></tr>

        <!-- Body -->
        <tr><td style="background:${colors.card};border-radius:0 0 10px 10px;padding:8px 24px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">

            ${section('Overview',
              stackedSection('Points Won', analysis.points_won1, analysis.points_won2) +
              stackedSection('Points Lost', analysis.points_lost1, analysis.points_lost2)
            )}

            ${section('Serve Performance',
              stackedSection('1st Serve %', analysis.first_srv_pct1, analysis.first_srv_pct2) +
              stackedSection('1st Serve Won %', analysis.first_srv_won_pct1, analysis.first_srv_won_pct2) +
              stackedSection('Serve Direction', analysis.first_srv_dir_count1, analysis.first_srv_dir_count2) +
              stackedSection('Game Point Serve Direction', analysis.game_point_srv_dir1, analysis.game_point_srv_dir2) +
              stackedSection('Serve + 1', analysis.serve_plus_one1, analysis.serve_plus_one2) +
              stackedSection('Serve Patterns', analysis.serve_pattern1, analysis.serve_pattern2)
            )}

            ${section('Rally & Return',
              singleSection('Rally Length', analysis.avg_rally_length) +
              stackedSection('Return Performance', analysis.return1, analysis.return2) +
              stackedSection('Short Points (1–5 shots)', analysis.short_point_analysis1, analysis.short_point_analysis2) +
              stackedSection('Medium Points (6–9 shots)', analysis.longer_point_analysis1, analysis.longer_point_analysis2) +
              stackedSection('Long Points (10+ shots)', analysis.very_long_point_analysis1, analysis.very_long_point_analysis2)
            )}

            ${section('High Pressure Points',
              stackedSection('Critical Points Won', analysis.high_pressure_point_won1, analysis.high_pressure_point_won2) +
              stackedSection('Critical Points Lost', analysis.high_pressure_point_lost1, analysis.high_pressure_point_lost2) +
              stackedSection('Game / Break Points', analysis.game_break_point1, analysis.game_break_point2) +
              stackedSection('Pressure Serve Direction', analysis.high_pressure_point_serve1, analysis.high_pressure_point_serve2)
            )}

            ${section('Errors & Winners',
              singleSection('Net Points', analysis.net_point) +
              stackedSection('Unforced Errors', analysis.unforced_error_classification1, analysis.unforced_error_classification2) +
              stackedSection('Winners', analysis.winner_classification1, analysis.winner_classification2)
            )}

            <!-- Footer -->
            <tr><td colspan="2" style="padding-top:24px;text-align:center;border-top:1px solid ${colors.border};margin-top:16px;">
              <div style="color:${colors.subhead};font-size:11px;">Generated by Tennis Analyzer</div>
            </td></tr>

          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  };



  const handleSharePdf = async () => {
    if (!analysis) {
      Alert.alert('No Analysis', 'Load the analysis first before sharing.');
      return;
    }

    try {
      // 1. Render the HTML report to a temporary PDF file
      const { uri: tmpUri } = await Print.printToFileAsync({
        html: formatReportAsHtml(),
        base64: false,
      });

      // 2. Rename to a meaningful filename: Player1_vs_Player2_YYYY-MM-DD.pdf
      //    Fall back to tmpUri if the rename step fails.
      let shareUri = tmpUri;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const safeName = (s) => (s || '').trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        const filename = `${safeName(match.player1)}_vs_${safeName(match.player2)}_${today}.pdf`;
        // Build the destination in the same directory as the temp file
        const dir = tmpUri.substring(0, tmpUri.lastIndexOf('/') + 1);
        const namedUri = dir + filename;
        await FileSystem.moveAsync({ from: tmpUri, to: namedUri });
        shareUri = namedUri;
      } catch (renameErr) {
        console.warn('PDF rename failed, using temp URI:', renameErr);
        // Rename failed — use original tmpUri, PDF still shares fine
      }

      // 3. Open the native share sheet — Gmail (as attachment), WhatsApp, Drive, etc.
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Analysis Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Your device does not support file sharing.');
      }
    } catch (e) {
      console.error('PDF generation failed:', e);
      Alert.alert('PDF Failed', 'Could not generate the PDF report. Please try again.');
    }
  };








  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Fetching analysis from Google Sheets...</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorTitle}>Match Not Found</Text>
        <Text style={styles.errorSub}>Could not load match details. The match may have been deleted.</Text>
        <HapticButton onPress={loadFromCacheOrCloud} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </HapticButton>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorTitle}>Analysis Unavailable</Text>
        <Text style={styles.errorSub}>Ensure you have synced point data for this match and try again.</Text>
        <HapticButton onPress={refreshFromCloud} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry Query</Text>
        </HapticButton>
      </View>
    );
  }

  // ─── Renderers ────────────────────────────────────────────────────

  /** Side-by-side comparison row for headline numbers */
  const renderCompareRow = (label, val1, val2) => (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <View style={styles.compareValues}>
        <Text style={styles.compareVal}>{val1 || '–'}</Text>
        <Text style={styles.compareSep}>vs</Text>
        <Text style={styles.compareVal}>{val2 || '–'}</Text>
      </View>
    </View>
  );

  /** Player header for stacked sections */
  const renderPlayerHeader = (name) => (
    <View style={styles.playerHeader}>
      <Text style={styles.playerHeaderText}>{name}</Text>
    </View>
  );

  /** Render parsed stat items as aligned label–value rows */
  const renderParsedItems = (items) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => (
      <View key={idx} style={styles.parsedRow}>
        <Text style={styles.parsedLabel}>{item.label}</Text>
        <Text style={styles.parsedValue}>{item.value}</Text>
      </View>
    ));
  };

  /** Full-width stacked block for one player's stat data */
  const renderPlayerStatBlock = (raw) => {
    // Pass player names so the parser can detect the no-colon double_fault format
    const parsed = parseStatString(raw, [match?.player1, match?.player2]);
    if (!parsed) return null;
    return (
      <View style={styles.playerBlock}>
        {renderPlayerHeader(parsed.player)}
        {renderParsedItems(parsed.items)}
      </View>
    );
  };

  /** Stacked card: two player blocks under one stat label */
  const renderStackedStat = (label, raw1, raw2) => {
    const clean1 = stripHtml(raw1);
    const clean2 = stripHtml(raw2);
    if (!clean1 && !clean2) return null;
    return (
      <View style={styles.stackedCard}>
        <Text style={styles.stackedLabel}>{label}</Text>
        {clean1 ? renderPlayerStatBlock(raw1) : null}
        {clean2 ? (
          <>
            <View style={styles.playerDivider} />
            {renderPlayerStatBlock(raw2)}
          </>
        ) : null}
      </View>
    );
  };

  /** Single full-width text block (for match-wide stats with no player split) */
  const renderTextStat = (label, raw) => {
    const clean = stripHtml(raw);
    if (!clean) return null;
    const parsed = parseStatString(raw);
    if (parsed && parsed.items.length > 0) {
      return (
        <View style={styles.stackedCard}>
          <Text style={styles.stackedLabel}>{label}</Text>
          <View style={styles.playerBlock}>
            {parsed.player ? renderPlayerHeader(parsed.player) : null}
            {renderParsedItems(parsed.items)}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.stackedCard}>
        <Text style={styles.stackedLabel}>{label}</Text>
        <Text style={styles.textContent}>{clean}</Text>
      </View>
    );
  };

  // Extract headline numbers for the side-by-side comparison rows
  const p1name = match.player1 || 'P1';
  const p2name = match.player2 || 'P2';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </HapticButton>
        <Text style={styles.headerTitle} numberOfLines={1}>Analysis Report</Text>
        <View style={styles.headerRight}>
          <HapticButton onPress={handleSharePdf} style={styles.headerIconButton}>
            <Ionicons name="share-outline" size={22} color="#3B82F6" />
          </HapticButton>
          <HapticButton onPress={refreshFromCloud} style={styles.headerIconButton} disabled={refreshing}>
            {refreshing
              ? <ActivityIndicator size="small" color="#3B82F6" />
              : <Ionicons name="refresh" size={22} color="#3B82F6" />}
          </HapticButton>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Match Header */}
        <View style={styles.matchMetaHeader}>
          <Text style={styles.matchMetaTitle}>
            {match.player1} vs {match.player2}
          </Text>
          <Text style={styles.matchMetaSub}>
            {match.tournament ? `${match.tournament} • ` : ''}{formatMatchDate(match.date)}
          </Text>
        </View>

        {/* ═══ SECTION: Overview ═══ */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggleSection('overview')} style={styles.accordionHeader}>
            <Text style={styles.sectionTitle}>Overview & Match Score</Text>
            <Ionicons 
              name={expandedSections.overview ? "chevron-up" : "chevron-down"} 
              size={20} color="#4B5563" 
            />
          </TouchableOpacity>
          {expandedSections.overview && (
            <View style={styles.accordionContent}>
              <View style={styles.overallScoreBox}>
                <Text style={styles.overallScoreLabel}>Calculated Score:</Text>
                <Text style={styles.overallScoreVal}>{stripHtml(analysis.score)}</Text>
              </View>
              {cachedAt ? (
                <Text style={styles.cachedAtText}>
                  Last fetched: {new Date(cachedAt).toLocaleString()}
                </Text>
              ) : null}

              {/* Side-by-side: headline points */}
              <View style={styles.compareHeader}>
                <Text style={styles.compareHeaderLabel}></Text>
                <View style={styles.compareValues}>
                  <Text style={styles.compareHeaderName}>{p1name}</Text>
                  <Text style={styles.compareSepBlank}> </Text>
                  <Text style={styles.compareHeaderName}>{p2name}</Text>
                </View>
              </View>
              {renderCompareRow(
                'Points Won',
                extractHeadlineNumber(analysis.points_won1),
                extractNumWithFallback(analysis.points_won1, analysis.points_won2)
              )}
              {renderCompareRow(
                'Points Lost',
                extractHeadlineNumber(analysis.points_lost1),
                extractNumWithFallback(analysis.points_lost1, analysis.points_lost2)
              )}

              {/* Detailed breakdown: stacked */}
              {renderStackedStat('Points Won Breakdown', analysis.points_won1, analysis.points_won2)}
              {renderStackedStat('Points Lost Breakdown', analysis.points_lost1, analysis.points_lost2)}
            </View>
          )}
        </Card>

        {/* ═══ SECTION: Serve Performance ═══ */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggleSection('serve')} style={styles.accordionHeader}>
            <Text style={styles.sectionTitle}>Serve Performance</Text>
            <Ionicons 
              name={expandedSections.serve ? "chevron-up" : "chevron-down"} 
              size={20} color="#4B5563" 
            />
          </TouchableOpacity>
          {expandedSections.serve && (
            <View style={styles.accordionContent}>
              {/* Side-by-side: key serve numbers */}
              <View style={styles.compareHeader}>
                <Text style={styles.compareHeaderLabel}></Text>
                <View style={styles.compareValues}>
                  <Text style={styles.compareHeaderName}>{p1name}</Text>
                  <Text style={styles.compareSepBlank}> </Text>
                  <Text style={styles.compareHeaderName}>{p2name}</Text>
                </View>
              </View>
              {renderCompareRow(
                '1st Serve In %',
                extractHeadlinePct(analysis.first_srv_pct1),
                extractPctWithFallback(analysis.first_srv_pct1, analysis.first_srv_pct2)
              )}
              {renderCompareRow(
                '1st Srv Won %',
                extractHeadlinePct(analysis.first_srv_won_pct1),
                extractPctWithFallback(analysis.first_srv_won_pct1, analysis.first_srv_won_pct2)
              )}
              {renderCompareRow(
                'Aces',
                extractHeadlineNumber(analysis.ace_count1),
                extractNumWithFallback(analysis.ace_count1, analysis.ace_count2)
              )}
              {renderCompareRow(
                'Double Faults',
                extractHeadlineNumber(analysis.double_fault1),
                extractNumWithFallback(analysis.double_fault1, analysis.double_fault2)
              )}

              {/* Detailed breakdowns: stacked */}
              {renderStackedStat('1st Serve % Details', analysis.first_srv_pct1, analysis.first_srv_pct2)}
              {renderStackedStat('1st Serve Won % Details', analysis.first_srv_won_pct1, analysis.first_srv_won_pct2)}
              {renderStackedStat('Serve Direction', analysis.first_srv_dir_count1, analysis.first_srv_dir_count2)}
              {renderStackedStat('Game Point Serve Dir', analysis.game_point_srv_dir1, analysis.game_point_srv_dir2)}
              {renderStackedStat('Serve + 1', analysis.serve_plus_one1, analysis.serve_plus_one2)}
              {renderStackedStat('Serve Patterns', analysis.serve_pattern1, analysis.serve_pattern2)}
              {renderStackedStat('Serve Histograms', analysis.serve_histogram1, analysis.serve_histogram2)}
            </View>
          )}
        </Card>

        {/* ═══ SECTION: Rally & Return Stats ═══ */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggleSection('rally')} style={styles.accordionHeader}>
            <Text style={styles.sectionTitle}>Rally & Return Stats</Text>
            <Ionicons 
              name={expandedSections.rally ? "chevron-up" : "chevron-down"} 
              size={20} color="#4B5563" 
            />
          </TouchableOpacity>
          {expandedSections.rally && (
            <View style={styles.accordionContent}>
              {renderTextStat('Rally Length', analysis.avg_rally_length)}
              {renderStackedStat('Return Performance', analysis.return1, analysis.return2)}
              {renderStackedStat('Short Points (1-5 shots)', analysis.short_point_analysis1, analysis.short_point_analysis2)}
              {renderStackedStat('Medium Points (6-9 shots)', analysis.longer_point_analysis1, analysis.longer_point_analysis2)}
              {renderStackedStat('Long Points (10+ shots)', analysis.very_long_point_analysis1, analysis.very_long_point_analysis2)}
            </View>
          )}
        </Card>

        {/* ═══ SECTION: High Pressure Points ═══ */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggleSection('pressure')} style={styles.accordionHeader}>
            <Text style={styles.sectionTitle}>High Pressure Points</Text>
            <Ionicons 
              name={expandedSections.pressure ? "chevron-up" : "chevron-down"} 
              size={20} color="#4B5563" 
            />
          </TouchableOpacity>
          {expandedSections.pressure && (
            <View style={styles.accordionContent}>
              {renderStackedStat('Critical Points Won', analysis.high_pressure_point_won1, analysis.high_pressure_point_won2)}
              {renderStackedStat('Critical Points Lost', analysis.high_pressure_point_lost1, analysis.high_pressure_point_lost2)}
              {renderStackedStat('Game / Break Points', analysis.game_break_point1, analysis.game_break_point2)}
              {renderStackedStat('Pressure Serve Direction', analysis.high_pressure_point_serve1, analysis.high_pressure_point_serve2)}
              {renderStackedStat('Game/Break Point Histograms', analysis.game_break_point_histogram1, analysis.game_break_point_histogram2)}
            </View>
          )}
        </Card>

        {/* ═══ SECTION: Errors & Winners ═══ */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggleSection('errors')} style={styles.accordionHeader}>
            <Text style={styles.sectionTitle}>Errors & Winners</Text>
            <Ionicons 
              name={expandedSections.errors ? "chevron-up" : "chevron-down"} 
              size={20} color="#4B5563" 
            />
          </TouchableOpacity>
          {expandedSections.errors && (
            <View style={styles.accordionContent}>
              {renderTextStat('Net Points', analysis.net_point)}
              {renderStackedStat('Unforced Errors', analysis.unforced_error_classification1, analysis.unforced_error_classification2)}
              {renderStackedStat('Winners', analysis.winner_classification1, analysis.winner_classification2)}
              {renderStackedStat('Performance Histograms', analysis.performance_histogram1, analysis.performance_histogram2)}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F9FAFB',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  errorSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  matchMetaHeader: {
    marginBottom: 14,
    paddingLeft: 4,
  },
  matchMetaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  matchMetaSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 10,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  accordionContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FCFDFE',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },

  // ─── Overall score box ─────────────────────────────
  overallScoreBox: {
    backgroundColor: '#EEF2F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  overallScoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  overallScoreVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
    textAlign: 'center',
  },
  cachedAtText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: -4,
  },

  // ─── Side-by-side comparison rows ──────────────────
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 2,
  },
  compareHeaderLabel: {
    flex: 1,
  },
  compareHeaderName: {
    width: 56,
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    textAlign: 'center',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#F0F0F0',
  },
  compareLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  compareValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareVal: {
    width: 56,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  compareSep: {
    fontSize: 11,
    color: '#9CA3AF',
    marginHorizontal: 4,
    width: 16,
    textAlign: 'center',
  },
  compareSepBlank: {
    marginHorizontal: 4,
    width: 16,
  },

  // ─── Stacked stat card ─────────────────────────────
  stackedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    padding: 10,
  },
  stackedLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  // ─── Player block inside stacked card ──────────────
  playerBlock: {
    marginBottom: 2,
  },
  playerHeader: {
    marginBottom: 4,
  },
  playerHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  playerDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },

  // ─── Parsed label–value rows ───────────────────────
  parsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
    paddingLeft: 8,
  },
  parsedLabel: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    paddingRight: 8,
  },
  parsedValue: {
    flexShrink: 1,
    maxWidth: '55%',
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
    lineHeight: 17,
  },

  // ─── Fallback text content ─────────────────────────
  textContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
});
