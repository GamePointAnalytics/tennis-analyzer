import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import { createMatch, updateMatch, getMatch } from '../database/db';
import { getSettings } from '../utils/settings';

export default function MatchEditorScreen({ route, navigation }) {
  const matchIndexParam = route.params?.matchIndex;
  const isEditing = !!matchIndexParam;

  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [tournament, setTournament] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [adScoring, setAdScoring] = useState(true); // true = ad, false = no-ad
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadMatchDetails();
    } else {
      // Set default date as today's date formatted as YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
    }
  }, [matchIndexParam]);

  const loadMatchDetails = async () => {
    setLoading(true);
    try {
      const match = await getMatch(matchIndexParam);
      if (match) {
        setPlayer1(match.player1 || '');
        setPlayer2(match.player2 || '');
        setTournament(match.tournament || '');
        setDate(match.date || '');
        setLocation(match.location || '');
        setAdScoring(match.adScoring === 'ad');
        setNotes(match.notes || '');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load match details.');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!player1.trim() || !player2.trim()) {
      Alert.alert('Validation Error', 'Player 1 and Player 2 names are required.');
      return;
    }

    setLoading(true);
    try {
      const settings = await getSettings();
      const adScoringVal = adScoring ? 'ad' : 'no-ad';
      
      if (isEditing) {
        await updateMatch({
          matchIndex: matchIndexParam,
          player1: player1.trim(),
          player2: player2.trim(),
          tournament: tournament.trim(),
          date: date.trim(),
          location: location.trim(),
          adScoring: adScoringVal,
          notes: notes.trim()
        });
        setLoading(false);
        Alert.alert('Success', 'Match updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Generate unique match index (uuid style)
        const matchIndex = 'm_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        await createMatch({
          matchIndex,
          user: settings.userId,
          player1: player1.trim(),
          player2: player2.trim(),
          tournament: tournament.trim(),
          date: date.trim(),
          location: location.trim(),
          adScoring: adScoringVal,
          notes: notes.trim()
        });
        setLoading(false);
        Alert.alert('Success', 'Match created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      Alert.alert('Error', 'Failed to save match.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{isEditing ? 'Edit Match Info' : 'New Match'}</Text>
      <Text style={styles.subtitle}>Define match setup and indexing details</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Player 1 Name (e.g. Server)</Text>
        <TextInput 
          style={styles.input} 
          value={player1} 
          onChangeText={setPlayer1}
          placeholder="Player 1"
        />

        <Text style={[styles.label, styles.marginTop]}>Player 2 Name (e.g. Opponent)</Text>
        <TextInput 
          style={styles.input} 
          value={player2} 
          onChangeText={setPlayer2}
          placeholder="Player 2"
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Tournament / Event</Text>
        <TextInput 
          style={styles.input} 
          value={tournament} 
          onChangeText={setTournament}
          placeholder="e.g. Club Championship"
        />

        <Text style={[styles.label, styles.marginTop]}>Match Date (YYYY-MM-DD)</Text>
        <TextInput 
          style={styles.input} 
          value={date} 
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={[styles.label, styles.marginTop]}>Location / Venue</Text>
        <TextInput 
          style={styles.input} 
          value={location} 
          onChangeText={setLocation}
          placeholder="e.g. Court 3"
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.switchLabel}>Advantage Scoring (Ad)</Text>
            <Text style={styles.switchSubLabel}>
              {adScoring ? 'Standard advantage points' : 'Deciding point at 40-40 (No-Ad)'}
            </Text>
          </View>
          <Switch 
            value={adScoring} 
            onValueChange={setAdScoring}
            trackColor={{ false: '#767577', true: '#3B82F6' }}
            thumbColor={adScoring ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Notes</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={notes} 
          onChangeText={setNotes}
          placeholder="Match description, weather, court conditions..."
          multiline
          numberOfLines={4}
        />
      </Card>

      <HapticButton onPress={handleSave} style={styles.saveButton} disabled={loading}>
        <Text style={styles.saveButtonText}>{isEditing ? 'Save Changes' : 'Create Match'}</Text>
      </HapticButton>
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
    paddingBottom: 40,
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
  card: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  marginTop: {
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  switchSubLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
