import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import { getSettings, saveSettings } from '../utils/settings';
import { syncPendingData } from '../utils/syncManager';

export default function SettingsScreen() {
  const [userId, setUserId] = useState('');
  const [savedUserId, setSavedUserId] = useState(''); // tracks what is actually persisted
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setLoading(true);
    const settings = await getSettings();
    const id = settings.userId || '';
    setUserId(id);
    setSavedUserId(id);
    setLoading(false);
  };

  // Save whatever is currently in the userId field
  const handleSaveUserId = async () => {
    const trimmed = userId.trim();
    if (!trimmed) {
      Alert.alert('Invalid ID', 'User ID cannot be empty.');
      return;
    }
    setSavingId(true);
    const settings = await getSettings();
    const success = await saveSettings({ userId: trimmed, webAppUrl: settings.webAppUrl });
    setSavingId(false);
    if (success) {
      setSavedUserId(trimmed);
      setUserId(trimmed);
      Alert.alert('Saved', 'Your User ID has been updated. This device will now sync data under the new ID.');
    } else {
      Alert.alert('Error', 'Failed to save User ID.');
    }
  };

  // Generate a fresh random ID — warn user first since it disconnects from existing data
  const handleGenerateUserId = () => {
    Alert.alert(
      'Generate New ID?',
      'This will create a new random User ID. You will lose access to match data recorded under your current ID (unless you save your current ID somewhere first).\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: async () => {
            const newId = Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
            setUserId(newId);
            const settings = await getSettings();
            await saveSettings({ userId: newId, webAppUrl: settings.webAppUrl });
            setSavedUserId(newId);
          },
        },
      ]
    );
  };

  const handleForceSync = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    const result = await syncPendingData();
    setSyncing(false);
    syncingRef.current = false;

    if (result.success) {
      const parts = [];
      if (result.syncedCount > 0)
        parts.push(`Uploaded ${result.syncedCount} match${result.syncedCount !== 1 ? 'es' : ''}`);
      if (result.importedCount > 0)
        parts.push(`Imported ${result.importedCount} match${result.importedCount !== 1 ? 'es' : ''} from cloud`);
      Alert.alert('Sync Complete', parts.length > 0 ? parts.join('\n') : 'Everything is up to date.');
    } else {
      const importNote = result.importedCount > 0 ? `\nImported ${result.importedCount} match${result.importedCount !== 1 ? 'es' : ''} from cloud.` : '';
      Alert.alert('Sync Warning', `${result.error}${importNote}`);
    }
  };

  const isDirty = userId.trim() !== savedUserId;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage your identity and data sync</Text>

      {/* ── User ID ── */}
      <Card style={styles.card}>
        <Text style={styles.sectionHeader}>Your User ID</Text>

        <TextInput
          style={styles.idInput}
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSaveUserId}
          selectTextOnFocus
        />

        <View style={styles.idButtonRow}>
          <HapticButton
            onPress={handleSaveUserId}
            style={[styles.saveIdButton, !isDirty && styles.saveIdButtonDimmed]}
            disabled={!isDirty || savingId}
          >
            {savingId ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveIdButtonText}>
                {isDirty ? 'Save Changes' : 'Saved ✓'}
              </Text>
            )}
          </HapticButton>

          <HapticButton onPress={handleGenerateUserId} style={styles.regenButton}>
            <Ionicons name="refresh-outline" size={15} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={styles.regenButtonText}>New ID</Text>
          </HapticButton>
        </View>

        {/* How it works */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="phone-portrait-outline" size={15} color="#3B82F6" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Switch phones?</Text> Copy your ID here and paste it into the app on your new phone to restore all your match data.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={15} color="#3B82F6" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Share with your team.</Text> Everyone using the same ID sees the same match history. Coaches and players can all chart from the same account.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="lock-closed-outline" size={15} color="#3B82F6" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>No login needed.</Text> Your ID is randomly generated and acts as your private key. Keep it safe — anyone with your ID can see your data.
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Sync ── */}
      <HapticButton
        onPress={handleForceSync}
        style={styles.syncButton}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={styles.syncButtonText}>Sync Unsaved Data</Text>
          </>
        )}
      </HapticButton>
      <Text style={styles.syncHint}>
        Data is saved locally first and synced to the cloud when you tap this button or when the app is online.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  idInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: '#1F2937',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  idButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  saveIdButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIdButtonDimmed: {
    backgroundColor: '#93C5FD',
  },
  saveIdButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  regenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  regenButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    lineHeight: 17,
  },
  infoBold: {
    fontWeight: '700',
    color: '#1D4ED8',
  },
  syncButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 15,
  },
  syncHint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
});
