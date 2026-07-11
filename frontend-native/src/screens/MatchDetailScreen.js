import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import { getMatch, getPoints } from '../database/db';
import { syncPendingData } from '../utils/syncManager';

export default function MatchDetailScreen({ route, navigation }) {
  const { matchIndex } = route.params;
  const isFocused = useIsFocused();

  const [match, setMatch] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadMatchAndPoints();
    }
  }, [isFocused]);

  const loadMatchAndPoints = async () => {
    setLoading(true);
    try {
      const matchData = await getMatch(matchIndex);
      const pointsData = await getPoints(matchIndex);
      setMatch(matchData);
      setPoints(pointsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load match details.');
    }
    setLoading(false);
  };

  const handleSyncAndRefresh = async () => {
    setSyncing(true);
    try {
      // Sync points and match changes first
      const syncRes = await syncPendingData();
      
      // Reload local data
      const matchData = await getMatch(matchIndex);
      const pointsData = await getPoints(matchIndex);
      setMatch(matchData);
      setPoints(pointsData);

      if (syncRes.success) {
        const parts = ['Match data synchronized with Google Sheets.'];
        if (syncRes.importedCount > 0)
          parts.push(`Also imported ${syncRes.importedCount} new match${syncRes.importedCount !== 1 ? 'es' : ''} — check the matches list.`);
        Alert.alert('Sync Successful', parts.join('\n'));
      } else {
        const importNote = syncRes.importedCount > 0 ? `\nImported ${syncRes.importedCount} new match${syncRes.importedCount !== 1 ? 'es' : ''} from cloud.` : '';
        Alert.alert('Sync Warning', `Cloud sync failed: ${syncRes.error}${importNote}`);
      }
    } catch (err) {
      Alert.alert('Error', `Sync encountered an error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={{ fontSize: 16, color: '#374151', marginTop: 12, fontWeight: '600' }}>Match not found</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>This match may have been deleted.</Text>
      </View>
    );
  }

  // Determine current score from the stored post-scores of the last charted point.
  // We always use stored post-scores rather than recalculating from scratch, because
  // users may skip points during charting and resume with manually-set pre-scores.
  // The calculator can't handle these gaps — it assumes continuous point-by-point
  // progression. The stored post-scores are computed at save time and are always correct.
  let set1 = 0;
  let set2 = 0;
  let game1 = 0;
  let game2 = 0;
  let pointScore = '0-0';
  let matchOver = false;

  if (points.length > 0) {
    const lastPt = points[points.length - 1];
    set1   = lastPt.setScore1Post  ?? 0;
    set2   = lastPt.setScore2Post  ?? 0;
    game1  = lastPt.gameScore1Post ?? 0;
    game2  = lastPt.gameScore2Post ?? 0;
    const ps1 = lastPt.pointScore1Post ?? '0';
    const ps2 = lastPt.pointScore2Post ?? '0';
    pointScore = `${ps1}-${ps2}`;

    // Detect completed sets that the stored data didn't account for.
    // Some data sources track game scores within a set but don't auto-increment
    // the set counter when a set-winning game is reached. Fix it here.
    const setWonByP1 = (game1 >= 6 && (game1 - game2) >= 2) || (game1 === 7 && game2 === 6);
    const setWonByP2 = (game2 >= 6 && (game2 - game1) >= 2) || (game2 === 7 && game1 === 6);
    if (setWonByP1) {
      set1++;
      game1 = 0;
      game2 = 0;
      pointScore = '0-0';
    } else if (setWonByP2) {
      set2++;
      game1 = 0;
      game2 = 0;
      pointScore = '0-0';
    }
  }



  // Resolve a server/winner value to 'player1'/'player2'.
  // Handles both the canonical identifiers and any raw player name strings
  // that may remain in older locally-stored data.
  const resolvePlayerId = (value, matchData) => {
    if (value === 'player1' || value === 'player2') return value;
    if (!value || !matchData) return '';
    const v = value.trim().toLowerCase();
    if (v === (matchData.player1 || '').trim().toLowerCase()) return 'player1';
    if (v === (matchData.player2 || '').trim().toLowerCase()) return 'player2';
    return '';
  };

  const renderPointItem = ({ item, index }) => {
    const serverId = resolvePlayerId(item.server, match);
    const winnerId = resolvePlayerId(item.winner, match);
    const isPlayer1Winner = winnerId === 'player1';
    
    // Format details
    let detail = '';
    if (item.firstServeOutcome === 'ace') {
      detail = 'Ace';
    } else if (
      (item.firstServeOutcome === 'out' || item.firstServeOutcome === 'net') &&
      (item.secondServeOutcome === 'out' || item.secondServeOutcome === 'net')
    ) {
      detail = 'Double Fault';
    } else if (item.outcomeType) {
      detail = item.outcomeType;
      if (item.lastShotType && item.lastShotType !== 'serve') {
        detail += ` (${item.lastShotHand} ${item.lastShotType})`;
      }
    }

    return (
      <TouchableOpacity
        style={styles.pointRow}
        onPress={() => navigation.navigate('PointEditor', { matchIndex, editPointIndex: index })}
        activeOpacity={0.65}
      >
        <Text style={styles.pointIndexText}>Pt {index + 1}</Text>
        <Text style={styles.pointServerText}>
          Srv: {serverId === 'player1' ? 'P1' : serverId === 'player2' ? 'P2' : '?'}
        </Text>
        <View style={styles.pointScoreContainer}>
          <Text style={styles.pointScoreVal}>
            {item.tiebreak === 'true' 
              ? `[TB] ${item.tiebreakScore1Pre ?? 0}-${item.tiebreakScore2Pre ?? 0}`
              : `${item.pointScore1Pre}-${item.pointScore2Pre}`}
          </Text>
        </View>
        <Text style={[styles.pointWinnerVal, isPlayer1Winner ? styles.p1Text : styles.p2Text]}>
          {winnerId ? (isPlayer1Winner ? 'P1 Won' : 'P2 Won') : '?'}
        </Text>
        {detail ? <Text style={styles.pointDetailText} numberOfLines={1}>{detail}</Text> : null}
        <Ionicons name="pencil-outline" size={13} color="#D1D5DB" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </HapticButton>
        <Text style={styles.headerTitle} numberOfLines={1}>Match Detail</Text>
        <HapticButton onPress={handleSyncAndRefresh} style={styles.syncButton} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons name="sync-outline" size={22} color="#3B82F6" />
          )}
        </HapticButton>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Live Scoreboard */}
        <Card style={styles.scoreboardCard}>
          <Text style={styles.scoreboardTitle}>Current Score</Text>
          <View style={styles.scoreboardRow}>
            <View style={styles.scorePlayerCol}>
              <Text style={styles.scorePlayerName} numberOfLines={1}>{match.player1}</Text>
              <Text style={styles.scorePlayerSub}>Player 1</Text>
            </View>
            
            <View style={styles.scoreStatsCol}>
              <Text style={styles.setsText}>{set1}</Text>
              <Text style={styles.scoreLabel}>Sets</Text>
            </View>
            {!matchOver && (
              <View style={styles.scoreStatsCol}>
                <Text style={styles.gamesText}>{game1}</Text>
                <Text style={styles.scoreLabel}>Games</Text>
              </View>
            )}

            <View style={styles.vsCol}>
              <Text style={styles.vsLabel}>vs</Text>
            </View>

            {!matchOver && (
              <View style={styles.scoreStatsCol}>
                <Text style={styles.gamesText}>{game2}</Text>
                <Text style={styles.scoreLabel}>Games</Text>
              </View>
            )}
            <View style={styles.scoreStatsCol}>
              <Text style={styles.setsText}>{set2}</Text>
              <Text style={styles.scoreLabel}>Sets</Text>
            </View>

            <View style={styles.scorePlayerColRight}>
              <Text style={styles.scorePlayerName} numberOfLines={1}>{match.player2}</Text>
              <Text style={styles.scorePlayerSub}>Player 2</Text>
            </View>
          </View>
          
          <View style={styles.livePointScoreRow}>
            {matchOver ? (
              <Text style={[styles.livePointLabel, { color: '#10B981', fontWeight: '700' }]}>✓ Match Complete</Text>
            ) : (
              <>
                <Text style={styles.livePointLabel}>Live Point Score:</Text>
                <Text style={styles.livePointScoreVal}>{pointScore}</Text>
              </>
            )}
          </View>

        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <HapticButton 
            onPress={() => navigation.navigate('PointEditor', { matchIndex })}
            style={styles.chartButton}
          >
            <Ionicons name="tennisball" size={20} color="#FFFFFF" />
            <Text style={styles.chartButtonText}>Chart Points</Text>
          </HapticButton>

          <HapticButton
            onPress={() => navigation.navigate('Analysis', { matchIndex })}
            style={styles.analysisButton}
          >
            <Ionicons name="analytics" size={20} color="#3B82F6" />
            <Text style={styles.analysisButtonText}>View Stats</Text>
          </HapticButton>
        </View>

        {/* Insights Report (new, additive) */}
        <HapticButton
          onPress={() => navigation.navigate('InsightsReport', { matchIndexes: [matchIndex], side: 'player1' })}
          style={styles.insightsButton}
        >
          <Ionicons name="bulb-outline" size={20} color="#FFFFFF" />
          <Text style={styles.insightsButtonText}>Insights Report</Text>
        </HapticButton>

        {/* Match Metadata */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Match Info</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tournament</Text>
              <Text style={styles.infoVal}>{match.tournament || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoVal}>{(() => {
                if (!match.date) return 'N/A';
                const d = new Date(match.date);
                if (isNaN(d.getTime())) return match.date;
                // Use day-month-year with abbreviated month: "8 Sep 2022"
                // This format is unambiguous and most familiar internationally
                return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
              })()}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoVal}>{match.location || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Format</Text>
              <Text style={styles.infoVal}>{match.adScoring === 'ad' ? 'Advantage (Ad)' : 'No-Advantage (No-Ad)'}</Text>
            </View>
          </View>
          {match.notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.notesVal}>{match.notes}</Text>
            </View>
          ) : null}
        </Card>

        {/* Point History List */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Point History ({points.length})</Text>
          {points.length > 0 ? (
            <Text style={styles.historySub}>Scroll down to see charted points</Text>
          ) : null}
        </View>

        {points.length === 0 ? (
          <View style={styles.emptyPoints}>
            <Ionicons name="list" size={40} color="#D1D5DB" />
            <Text style={styles.emptyPointsText}>No points charted yet.</Text>
            <Text style={styles.emptyPointsSub}>Tap 'Chart Points' to start recording matches.</Text>
          </View>
        ) : (
          <Card style={styles.pointsListCard}>
            {points.map((item, index) => (
            <React.Fragment key={item.pointIndex ?? index}>
              {renderPointItem({ item, index })}
            </React.Fragment>
          ))}
          </Card>
        )}
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
  syncButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scoreboardCard: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#1E293B', // Dark theme slate-800 for scoreboard
    borderColor: '#1E293B',
  },
  scoreboardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  scorePlayerCol: {
    flex: 2,
    alignItems: 'flex-start',
  },
  scorePlayerColRight: {
    flex: 2,
    alignItems: 'flex-end',
  },
  scorePlayerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scorePlayerSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  scoreStatsCol: {
    flex: 1,
    alignItems: 'center',
  },
  vsCol: {
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  vsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  setsText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10B981', // green accent
  },
  gamesText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  livePointScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155', // Slate-700
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 18,
  },
  livePointLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 6,
  },
  livePointScoreVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FBBF24', // Amber
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  chartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6', // Blue-500
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  chartButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  analysisButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  analysisButtonText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B', // slate-800
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  insightsButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    paddingTop: 10,
  },
  notesVal: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  historySub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyPoints: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    paddingVertical: 32,
    marginTop: 8,
  },
  emptyPointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 10,
  },
  emptyPointsSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  pointsListCard: {
    padding: 0,
    overflow: 'hidden',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  pointIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    width: 44,
  },
  pointServerText: {
    fontSize: 12,
    color: '#4B5563',
    width: 60,
  },
  pointScoreContainer: {
    width: 90,
  },
  pointScoreVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  pointWinnerVal: {
    fontSize: 13,
    fontWeight: '700',
    width: 64,
  },
  p1Text: {
    color: '#10B981',
  },
  p2Text: {
    color: '#EF4444',
  },
  pointDetailText: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
  },
});
