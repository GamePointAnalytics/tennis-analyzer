import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Alert,
  RefreshControl,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import { getMatches, deleteMatch } from '../database/db';
import { deleteMatchFromCloud } from '../utils/api';
import { syncPendingData } from '../utils/syncManager';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState({}); // matchIndex -> true

  const selectedCount = Object.keys(selected).filter((k) => selected[k]).length;

  const toggleSelect = (matchIndex) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[matchIndex]) delete next[matchIndex];
      else next[matchIndex] = true;
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected({});
  };

  const analyzeSelected = () => {
    if (selectedCount === 0) return;
    const matchIndexes = matches
      .filter((m) => selected[m.matchIndex])
      .map((m) => m.matchIndex);
    exitSelectMode();
    navigation.navigate('InsightsReport', { matchIndexes, side: 'player1' });
  };

  useEffect(() => {
    if (isFocused) {
      loadMatches();
    }
  }, [isFocused]);

  const loadMatches = async () => {
    try {
      const list = await getMatches();
      setMatches(list);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // 1. Sync any unsynced data
      const syncRes = await syncPendingData();
      if (!syncRes.success) {
        console.warn('Background sync failed:', syncRes.error);
      }
      // 2. Reload matches list
      await loadMatches();
    } catch (err) {
      console.error('handleRefresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (matchIndex) => {
    Alert.alert(
      'Delete Match',
      'Are you sure you want to delete this match? This will remove all local point data and attempt to delete the record on the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete locally
              await deleteMatch(matchIndex);
              // Delete from cloud
              await deleteMatchFromCloud(matchIndex).catch(err => {
                console.warn('Failed to delete from cloud (offline?):', err.message);
              });
              loadMatches();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete match.');
            }
          }
        }
      ]
    );
  };

  const renderMatchItem = ({ item }) => {
    const isSynced = item.syncStatus === 'synced';
    const formattedDate = (() => {
      if (!item.date) return 'Unknown date';
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return item.date;
      return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    })();

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dateText}>{formattedDate}</Text>
            {item.tournament ? <Text style={styles.tournamentText}>{item.tournament}</Text> : null}
          </View>
          <View style={[styles.syncBadge, isSynced ? styles.badgeSynced : styles.badgePending]}>
            <Ionicons 
              name={isSynced ? "cloud-done-outline" : "cloud-upload-outline"} 
              size={12} 
              color={isSynced ? "#10B981" : "#F59E0B"} 
            />
            <Text style={[styles.syncText, isSynced ? styles.syncTextSynced : styles.syncTextPending]}>
              {isSynced ? 'Synced' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.playersRow}>
          <View style={styles.playerContainer}>
            <Text style={styles.playerRole}>Player 1</Text>
            <Text style={styles.playerName} numberOfLines={1}>{item.player1 || 'TBD'}</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.playerContainer}>
            <Text style={styles.playerRole}>Player 2</Text>
            <Text style={styles.playerName} numberOfLines={1}>{item.player2 || 'TBD'}</Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.cardActions}>
          {selectMode ? (
            <HapticButton
              onPress={() => toggleSelect(item.matchIndex)}
              style={[
                styles.detailButton,
                selected[item.matchIndex] && styles.detailButtonSelected,
              ]}
            >
              <Ionicons
                name={selected[item.matchIndex] ? 'checkbox' : 'square-outline'}
                size={16}
                color={selected[item.matchIndex] ? '#FFFFFF' : '#3B82F6'}
              />
              <Text
                style={[
                  styles.detailButtonText,
                  selected[item.matchIndex] && styles.detailButtonTextSelected,
                ]}
              >
                {selected[item.matchIndex] ? 'Selected' : 'Select for analysis'}
              </Text>
            </HapticButton>
          ) : (
            <>
              <HapticButton
                onPress={() => navigation.navigate('MatchDetail', { matchIndex: item.matchIndex })}
                style={styles.detailButton}
              >
                <Ionicons name="eye-outline" size={16} color="#3B82F6" />
                <Text style={styles.detailButtonText}>View Detail</Text>
              </HapticButton>

              <View style={styles.rightActions}>
                <HapticButton
                  onPress={() => navigation.navigate('MatchEditor', { matchIndex: item.matchIndex })}
                  style={styles.actionIconButton}
                >
                  <Ionicons name="create-outline" size={18} color="#4B5563" />
                </HapticButton>

                <HapticButton
                  onPress={() => handleDelete(item.matchIndex)}
                  style={styles.actionIconButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </HapticButton>
              </View>
            </>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Matches</Text>
          <Text style={styles.subtitle}>Your match history</Text>
        </View>
        <View style={styles.headerButtons}>
          <HapticButton
            onPress={selectMode ? exitSelectMode : () => setSelectMode(true)}
            style={styles.settingsButton}
          >
            <Ionicons
              name={selectMode ? 'close' : 'checkbox-outline'}
              size={22}
              color={selectMode ? '#EF4444' : '#1F2937'}
            />
          </HapticButton>
          <HapticButton
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={22} color="#1F2937" />
          </HapticButton>
          <HapticButton
            onPress={() => navigation.navigate('MatchEditor')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </HapticButton>
        </View>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchIndex}
        renderItem={renderMatchItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3B82F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="tennisball-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Matches Found</Text>
            <Text style={styles.emptySubtitle}>Tap the "+" icon above to record a new match</Text>
            <HapticButton 
              onPress={() => navigation.navigate('MatchEditor')}
              style={styles.emptyAddButton}
            >
              <Text style={styles.emptyAddButtonText}>Create Your First Match</Text>
            </HapticButton>
          </View>
        }
      />

      {selectMode ? (
        <View style={styles.selectBar}>
          <Text style={styles.selectBarText}>
            {selectedCount} match{selectedCount !== 1 ? 'es' : ''} selected
          </Text>
          <HapticButton
            onPress={analyzeSelected}
            style={[styles.selectBarButton, selectedCount === 0 && styles.selectBarButtonDisabled]}
            disabled={selectedCount === 0}
          >
            <Ionicons name="bulb-outline" size={18} color="#FFFFFF" />
            <Text style={styles.selectBarButtonText}>Analyze</Text>
          </HapticButton>
        </View>
      ) : null}
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  tournamentText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSynced: {
    backgroundColor: '#D1FAE5', // Light green
  },
  badgePending: {
    backgroundColor: '#FEF3C7', // Light orange
  },
  syncText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  syncTextSynced: {
    color: '#065F46',
  },
  syncTextPending: {
    color: '#92400E',
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  playerContainer: {
    flex: 1,
  },
  playerRole: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  vsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    paddingHorizontal: 12,
  },
  notesText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE', // Light blue
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailButtonText: {
    color: '#0369A1',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  detailButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  detailButtonTextSelected: {
    color: '#FFFFFF',
  },
  selectBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  selectBarText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  selectBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectBarButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  selectBarButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
  },
  emptyAddButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 24,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
