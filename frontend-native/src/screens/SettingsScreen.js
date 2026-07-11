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

  // Analysis & Insights settings
  const [analysisMode, setAnalysisMode] = useState('hybrid');
  const [aiProvider, setAiProvider] = useState('anthropic');
  const [savedAiProvider, setSavedAiProvider] = useState('anthropic');

  // API Keys
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');

  const [savedAnthropicApiKey, setSavedAnthropicApiKey] = useState('');
  const [savedOpenaiApiKey, setSavedOpenaiApiKey] = useState('');
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState('');
  const [savedOpenrouterApiKey, setSavedOpenrouterApiKey] = useState('');

  // Models
  const [anthropicModel, setAnthropicModel] = useState('');
  const [openaiModel, setOpenaiModel] = useState('');
  const [geminiModel, setGeminiModel] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('');

  const [savedAnthropicModel, setSavedAnthropicModel] = useState('');
  const [savedOpenaiModel, setSavedOpenaiModel] = useState('');
  const [savedGeminiModel, setSavedGeminiModel] = useState('');
  const [savedOpenrouterModel, setSavedOpenrouterModel] = useState('');

  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setLoading(true);
    const settings = await getSettings();

    const id = settings.userId || '';
    setUserId(id);
    setSavedUserId(id);

    setAnalysisMode(settings.analysisMode || 'hybrid');
    setAiProvider(settings.aiProvider || 'anthropic');
    setSavedAiProvider(settings.aiProvider || 'anthropic');

    setAnthropicApiKey(settings.anthropicApiKey || '');
    setSavedAnthropicApiKey(settings.anthropicApiKey || '');
    setOpenaiApiKey(settings.openaiApiKey || '');
    setSavedOpenaiApiKey(settings.openaiApiKey || '');
    setGeminiApiKey(settings.geminiApiKey || '');
    setSavedGeminiApiKey(settings.geminiApiKey || '');
    setOpenrouterApiKey(settings.openrouterApiKey || '');
    setSavedOpenrouterApiKey(settings.openrouterApiKey || '');

    setAnthropicModel(settings.anthropicModel || 'claude-sonnet-5');
    setSavedAnthropicModel(settings.anthropicModel || 'claude-sonnet-5');
    setOpenaiModel(settings.openaiModel || 'gpt-4o');
    setSavedOpenaiModel(settings.openaiModel || 'gpt-4o');
    setGeminiModel(settings.geminiModel || 'gemini-1.5-pro');
    setSavedGeminiModel(settings.geminiModel || 'gemini-1.5-pro');
    setOpenrouterModel(settings.openrouterModel || 'deepseek/deepseek-chat');
    setSavedOpenrouterModel(settings.openrouterModel || 'deepseek/deepseek-chat');

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

  // Save AI Settings (provider, keys, models)
  const handleSaveAiSettings = async () => {
    setSavingKey(true);
    const settings = await getSettings();
    const success = await saveSettings({
      webAppUrl: settings.webAppUrl,
      aiProvider,
      anthropicApiKey: anthropicApiKey.trim(),
      openaiApiKey: openaiApiKey.trim(),
      geminiApiKey: geminiApiKey.trim(),
      openrouterApiKey: openrouterApiKey.trim(),
      anthropicModel: anthropicModel.trim(),
      openaiModel: openaiModel.trim(),
      geminiModel: geminiModel.trim(),
      openrouterModel: openrouterModel.trim(),
    });
    setSavingKey(false);
    if (success) {
      setSavedAiProvider(aiProvider);
      setSavedAnthropicApiKey(anthropicApiKey.trim());
      setSavedOpenaiApiKey(openaiApiKey.trim());
      setSavedGeminiApiKey(geminiApiKey.trim());
      setSavedOpenrouterApiKey(openrouterApiKey.trim());
      setSavedAnthropicModel(anthropicModel.trim());
      setSavedOpenaiModel(openaiModel.trim());
      setSavedGeminiModel(geminiModel.trim());
      setSavedOpenrouterModel(openrouterModel.trim());
      Alert.alert('Saved', 'AI configuration saved successfully.');
    } else {
      Alert.alert('Error', 'Failed to save AI configuration.');
    }
  };

  // Mode selection saves immediately (it's a 3-way toggle, no separate Save step).
  const handleSelectMode = async (mode) => {
    setAnalysisMode(mode);
    const settings = await getSettings();
    await saveSettings({ analysisMode: mode, webAppUrl: settings.webAppUrl });
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
  const aiSettingsDirty =
    anthropicApiKey.trim() !== savedAnthropicApiKey ||
    openaiApiKey.trim() !== savedOpenaiApiKey ||
    geminiApiKey.trim() !== savedGeminiApiKey ||
    openrouterApiKey.trim() !== savedOpenrouterApiKey ||
    anthropicModel.trim() !== savedAnthropicModel ||
    openaiModel.trim() !== savedOpenaiModel ||
    geminiModel.trim() !== savedGeminiModel ||
    openrouterModel.trim() !== savedOpenrouterModel ||
    aiProvider !== savedAiProvider;

  const PROVIDER_OPTIONS = [
    { key: 'anthropic', label: 'Claude' },
    { key: 'openai', label: 'GPT' },
    { key: 'gemini', label: 'Gemini' },
    { key: 'openrouter', label: 'OpenRouter' },
  ];

  const getActiveState = () => {
    if (aiProvider === 'anthropic') {
      return {
        key: anthropicApiKey,
        setKey: setAnthropicApiKey,
        savedKey: savedAnthropicApiKey,
        model: anthropicModel,
        setModel: setAnthropicModel,
        savedModel: savedAnthropicModel,
        label: 'Claude (Anthropic)',
        placeholder: 'sk-ant-...',
        modelPlaceholder: 'claude-sonnet-5',
        infoUrl: 'console.anthropic.com'
      };
    }
    if (aiProvider === 'openai') {
      return {
        key: openaiApiKey,
        setKey: setOpenaiApiKey,
        savedKey: savedOpenaiApiKey,
        model: openaiModel,
        setModel: setOpenaiModel,
        savedModel: savedOpenaiModel,
        label: 'GPT (OpenAI)',
        placeholder: 'sk-...',
        modelPlaceholder: 'gpt-4o',
        infoUrl: 'platform.openai.com'
      };
    }
    if (aiProvider === 'gemini') {
      return {
        key: geminiApiKey,
        setKey: setGeminiApiKey,
        savedKey: savedGeminiApiKey,
        model: geminiModel,
        setModel: setGeminiModel,
        savedModel: savedGeminiModel,
        label: 'Gemini (Google)',
        placeholder: 'AIzaSy...',
        modelPlaceholder: 'gemini-1.5-pro',
        infoUrl: 'aistudio.google.com'
      };
    }
    return {
      key: openrouterApiKey,
      setKey: setOpenrouterApiKey,
      savedKey: savedOpenrouterApiKey,
      model: openrouterModel,
      setModel: setOpenrouterModel,
      savedModel: savedOpenrouterModel,
      label: 'OpenRouter',
      placeholder: 'sk-or-...',
      modelPlaceholder: 'deepseek/deepseek-chat',
      infoUrl: 'openrouter.ai'
    };
  };

  const active = getActiveState();

  const renderProviderButton = (opt) => {
    const isChosen = aiProvider === opt.key;
    return (
      <HapticButton
        key={opt.key}
        onPress={() => setAiProvider(opt.key)}
        style={[styles.providerButton, isChosen && styles.providerButtonActive]}
      >
        <Text style={[styles.providerButtonText, isChosen && styles.providerButtonTextActive]}>
          {opt.label}
        </Text>
      </HapticButton>
    );
  };

  const MODE_OPTIONS = [
    { key: 'deterministic', label: 'Rules' },
    { key: 'hybrid', label: 'Hybrid' },
    { key: 'llm', label: 'LLM' },
  ];

  const renderModeButton = (opt) => {
    const isActive = analysisMode === opt.key;
    return (
      <HapticButton
        key={opt.key}
        onPress={() => handleSelectMode(opt.key)}
        style={[styles.modeButton, isActive && styles.modeButtonActive]}
      >
        <Text style={[styles.modeButtonText, isActive && styles.modeButtonTextActive]}>
          {opt.label}
        </Text>
      </HapticButton>
    );
  };

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

      {/* ── Analysis & Insights ── */}
      <Card style={styles.card}>
        <Text style={styles.sectionHeader}>Analysis &amp; Insights</Text>
        <Text style={styles.cardSubtext}>
          Choose how match reports are generated. The new Insights report analyzes serve patterns,
          strengths/weaknesses, momentum, clutch performance, and gives a win/loss diagnosis with
          training recommendations.
        </Text>

        <Text style={styles.fieldLabel}>Report Mode</Text>
        <View style={styles.modeRow}>
          {MODE_OPTIONS.map(renderModeButton)}
        </View>
        <Text style={styles.modeHint}>
          {analysisMode === 'deterministic'
            ? 'Rules-only: instant, offline, no API key needed. Diagnosis is rule-based.'
            : analysisMode === 'hybrid'
              ? 'Hybrid: structured stats + AI-written diagnosis & recommendations (default).'
              : 'LLM: AI writes the full narrative report.'}
          {(analysisMode === 'hybrid' || analysisMode === 'llm') && !active.savedKey
            ? `\n⚠️ A key is required for this mode — configure ${active.label} below.`
            : ''}
        </Text>

        {analysisMode !== 'deterministic' ? (
          <>
            <Text style={styles.fieldLabel}>AI Provider</Text>
            <View style={styles.providerRow}>
              {PROVIDER_OPTIONS.map(renderProviderButton)}
            </View>

            <Text style={styles.fieldLabel}>{active.label} API Key</Text>
            <TextInput
              style={styles.idInput}
              value={active.key}
              onChangeText={active.setKey}
              placeholder={active.placeholder}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSaveAiSettings}
              selectTextOnFocus
            />

            <Text style={styles.fieldLabel}>{active.label} Model Name</Text>
            <TextInput
              style={styles.idInput}
              value={active.model}
              onChangeText={active.setModel}
              placeholder={active.modelPlaceholder}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSaveAiSettings}
              selectTextOnFocus
            />

            <View style={styles.idButtonRow}>
              <HapticButton
                onPress={handleSaveAiSettings}
                style={[styles.saveIdButton, !aiSettingsDirty && styles.saveIdButtonDimmed]}
                disabled={!aiSettingsDirty || savingKey}
              >
                {savingKey ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveIdButtonText}>
                    {aiSettingsDirty ? 'Save AI Configuration' : 'Saved ✓'}
                  </Text>
                )}
              </HapticButton>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Ionicons name="lock-closed-outline" size={15} color="#3B82F6" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Stored on this device only.</Text> Your key stays in secure
                  storage and is sent directly to the provider when generating a report — it never touches the
                  Tennis Analyzer cloud.
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="key-outline" size={15} color="#3B82F6" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Need a key?</Text> Create one at{' '}
                  <Text style={{ fontWeight: '700', textDecorationLine: 'underline', color: '#1D4ED8' }}>
                    {active.infoUrl}
                  </Text>
                  . You are billed directly by your chosen provider for LLM/Hybrid report generation.
                </Text>
              </View>
            </View>
          </>
        ) : null}
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
  cardSubtext: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modeButtonText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 13,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  modeHint: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
    marginBottom: 14,
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
  providerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  providerButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  providerButtonText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 11,
  },
  providerButtonTextActive: {
    color: '#FFFFFF',
  },
});
