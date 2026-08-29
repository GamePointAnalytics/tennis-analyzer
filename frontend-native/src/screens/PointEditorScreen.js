import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticButton from '../components/HapticButton';
import SegmentedControl from '../components/SegmentedControl';
import RallySelector from '../components/RallySelector';
import Card from '../components/Card';
import { getMatch, getPoints, savePoints } from '../database/db';
import { calculateScores } from '../utils/scoreCalculator';
import { syncPendingData } from '../utils/syncManager';

export default function PointEditorScreen({ route, navigation }) {
  const { matchIndex, editPointIndex } = route.params;
  const isEditMode = editPointIndex !== undefined && editPointIndex !== null;

  const [match, setMatch] = useState(null);
  const [pointsList, setPointsList] = useState([]);
  
  // Current point input state
  const [server, setServer] = useState('player1');
  const [firstServeDir, setFirstServeDir] = useState('');
  const [firstServeOutcome, setFirstServeOutcome] = useState('in'); // default: In
  
  const [secondServeDir, setSecondServeDir] = useState('');
  const [secondServeOutcome, setSecondServeOutcome] = useState('in'); // default: In
  
  const [rallyLength, setRallyLength] = useState(1);
  const [lastShotHand, setLastShotHand] = useState('');
  const [lastShotType, setLastShotType] = useState('');
  const [outcome, setOutcome] = useState('in');
  const [outcomeType, setOutcomeType] = useState('');
  const [winner, setWinner] = useState('');
  const [winnerManuallySet, setWinnerManuallySet] = useState(false); // tracks manual override
  const [notes, setNotes] = useState('');

  // Live calculated scores at the start of this point
  const [pointScore1, setPointScore1] = useState('0');
  const [pointScore2, setPointScore2] = useState('0');
  const [gameScore1, setGameScore1] = useState(0);
  const [gameScore2, setGameScore2] = useState(0);
  const [setScore1, setSetScore1] = useState(0);
  const [setScore2, setSetScore2] = useState(0);
  const [isTiebreak, setIsTiebreak] = useState(false);
  const [tiebreakType, setTiebreakType] = useState('7'); // '7' or '10'
  const savingRef = useRef(false); // guard against double-tap race
  const scrollViewRef = useRef(null); // for auto-scroll to top after save

  // Manual score override states
  const [hasOverrides, setHasOverrides] = useState(false);
  const [overrideSet1, setOverrideSet1] = useState(0);
  const [overrideSet2, setOverrideSet2] = useState(0);
  const [overrideGame1, setOverrideGame1] = useState(0);
  const [overrideGame2, setOverrideGame2] = useState(0);
  const [overridePoint1, setOverridePoint1] = useState('0');
  const [overridePoint2, setOverridePoint2] = useState('0');
  const [overrideTiebreak, setOverrideTiebreak] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadMatchAndPoints();
  }, [matchIndex]);

  // Auto-sync when user navigates away (end of charting session)
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      syncPendingData().catch(err => console.warn('Auto-sync on leave PointEditor:', err));
    });
    return unsubscribe;
  }, [navigation]);

  const loadMatchAndPoints = async () => {
    try {
      const matchData = await getMatch(matchIndex);
      const pointsData = await getPoints(matchIndex);
      setMatch(matchData);
      setPointsList(pointsData);
      
      if (isEditMode && pointsData[editPointIndex]) {
        prefillFromPoint(pointsData[editPointIndex]);
      } else {
        calculateNextPointScores(matchData, pointsData);
        setRallyLength(calcAverageRallyLength(pointsData));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load data.');
    }
  };

  // Compute the average rally length from saved points (excluding double faults with rallyLength 0).
  // Returns an integer >= 1.
  const calcAverageRallyLength = (points) => {
    const validPoints = points.filter(p => p.rallyLength > 0);
    if (validPoints.length === 0) return 1;
    const sum = validPoints.reduce((acc, p) => acc + (parseInt(p.rallyLength) || 1), 0);
    return Math.max(1, Math.round(sum / validPoints.length));
  };

  // Pre-fill the form from an existing point (edit mode)
  const prefillFromPoint = (point) => {
    // Resolve server/winner — handles 'player1'/'player2' identifiers and
    // any raw player name strings that may remain in older locally-stored data.
    const resolveId = (val) => {
      if (val === 'player1' || val === 'player2') return val;
      if (!val) return '';
      const v = val.trim().toLowerCase();
      if (v === (match?.player1 || '').trim().toLowerCase()) return 'player1';
      if (v === (match?.player2 || '').trim().toLowerCase()) return 'player2';
      return '';
    };

    setServer(resolveId(point.server) || 'player1');
    setFirstServeDir(point.firstServeDirection || '');
    setFirstServeOutcome(point.firstServeOutcome || 'in');
    setSecondServeDir(point.secondServeDirection || '');
    setSecondServeOutcome(point.secondServeOutcome || 'in');
    setRallyLength(parseInt(point.rallyLength) || 1);
    setLastShotHand(point.lastShotHand || '');
    setLastShotType(point.lastShotType || '');
    setOutcome(point.outcome || 'in');
    setOutcomeType(point.outcomeType || '');
    setWinner(resolveId(point.winner) || '');
    setWinnerManuallySet(true);
    setNotes(point.notes || '');
    setIsTiebreak(point.tiebreak === 'true');
    setTiebreakType(point.tiebreakType || '7');
    // Display the pre-scores that were recorded for this point
    setSetScore1(point.setScore1Pre ?? 0);
    setSetScore2(point.setScore2Pre ?? 0);
    setGameScore1(point.gameScore1Pre ?? 0);
    setGameScore2(point.gameScore2Pre ?? 0);
    setPointScore1(point.pointScore1Pre ?? '0');
    setPointScore2(point.pointScore2Pre ?? '0');
  };

  // Determine scores and server for the NEXT point based on current points history
  const calculateNextPointScores = (matchData, currentPoints) => {
    if (!matchData) return;

    if (currentPoints.length === 0) {
      // First point of match
      setServer('player1');
      setPointScore1('0');
      setPointScore2('0');
      setGameScore1(0);
      setGameScore2(0);
      setSetScore1(0);
      setSetScore2(0);
      setIsTiebreak(false);
      // No prior points yet — start at rally length 1
      setRallyLength(1);
      return;
    }

    // Re-run scores calculation up to the last point
    // We create a dummy next point to see what the score calculator outputs for it.
    // tiebreakType must be included so the threshold (7 or 10) is correct for ongoing tiebreaks.
    const dummyNextPoint = { winner: 'player1', tiebreakType }; // dummy winner to force score recalculation
    const allPoints = [...currentPoints, dummyNextPoint];
    const calculated = calculateScores(allPoints, 'player1', matchData.adScoring);
    
    // The pre-point scores of the dummy next point represent the live scores *after* the last point ended
    const nextPointScoreState = calculated[calculated.length - 1];
    
    setServer(nextPointScoreState.server);
    setIsTiebreak(nextPointScoreState.tiebreak === 'true');
    // Reset tiebreak format to 7-point default when a tiebreak ends
    if (nextPointScoreState.tiebreak !== 'true') {
      setTiebreakType('7');
    }
    setPointScore1(nextPointScoreState.pointScore1Pre);
    setPointScore2(nextPointScoreState.pointScore2Pre);
    setGameScore1(nextPointScoreState.gameScore1Pre);
    setGameScore2(nextPointScoreState.gameScore2Pre);
    setSetScore1(nextPointScoreState.setScore1Pre);
    setSetScore2(nextPointScoreState.setScore2Pre);
    // Note: rallyLength is set by the caller after this function returns.
  };

  // Smart defaults logic based on serve outcomes
  useEffect(() => {
    // If first serve is an Ace
    if (firstServeOutcome === 'ace') {
      setWinner(server);
      setWinnerManuallySet(true); // lock so the inference effect doesn't override it
      setRallyLength(1);
      setLastShotType('serve');
      setOutcome('in');
      setOutcomeType('winner');
      // Reset second serve to defaults
      setSecondServeOutcome('in');
      setSecondServeDir('');
    }
    // If first serve is in or let, second serve won't show — reset to defaults for when it next appears
    else if (firstServeOutcome === 'in' || firstServeOutcome === 'let') {
      setSecondServeOutcome('in');
      setSecondServeDir('');
    }
  }, [firstServeOutcome, server]);

  useEffect(() => {
    if (secondServeOutcome === 'out' || secondServeOutcome === 'net') {
      // Double fault — receiver wins
      const receiver = server === 'player1' ? 'player2' : 'player1';
      setWinner(receiver);
      setWinnerManuallySet(false);
      setRallyLength(0);
      setLastShotType('serve');
      setOutcome('out');
      setOutcomeType('unforced error');
    } else if (secondServeOutcome === 'ace') {
      // Second serve ace — server wins
      setWinner(server);
      setWinnerManuallySet(true);
      setRallyLength(1);
      setLastShotType('serve');
      setOutcome('in');
      setOutcomeType('winner');
    }
  }, [secondServeOutcome, server]);

  // Infer point winner from rally length + outcome classification.
  // Serve counts as shot #1. Odd rally length = server hit last shot.
  // Even rally length = returner hit last shot.
  // Winner classification → last-shot hitter wins.
  // Error classification → last-shot hitter loses (other player wins).
  useEffect(() => {
    if (winnerManuallySet) return; // user already chose manually — don't override
    if (!outcomeType) return; // not enough info yet
    if (rallyLength === 0) return; // double fault already handled above

    const receiver = server === 'player1' ? 'player2' : 'player1';
    // Odd rally = server hit last; even rally = receiver hit last
    const lastShotHitter = rallyLength % 2 === 1 ? server : receiver;
    const otherPlayer = lastShotHitter === 'player1' ? 'player2' : 'player1';

    if (outcomeType === 'winner') {
      setWinner(lastShotHitter);
    } else if (outcomeType === 'unforced error' || outcomeType === 'forced error') {
      setWinner(otherPlayer);
    }
  }, [rallyLength, outcomeType, server, winnerManuallySet]);

  const handleOpenAdjustScoreModal = () => {
    setOverrideSet1(setScore1);
    setOverrideSet2(setScore2);
    setOverrideGame1(gameScore1);
    setOverrideGame2(gameScore2);
    setOverridePoint1(pointScore1);
    setOverridePoint2(pointScore2);
    setOverrideTiebreak(isTiebreak);
    setModalVisible(true);
  };

  const handleApplyAdjustments = () => {
    setSetScore1(overrideSet1);
    setSetScore2(overrideSet2);
    setGameScore1(overrideGame1);
    setGameScore2(overrideGame2);
    setPointScore1(overridePoint1);
    setPointScore2(overridePoint2);
    setIsTiebreak(overrideTiebreak);
    setHasOverrides(true);
    setModalVisible(false);
  };

  // Builds the point object from current form state, with any fields in
  // `overrides` taking precedence — lets quick-log shortcuts (Ace/Double
  // Fault) save a fully-formed point without waiting on React state/effect
  // timing.
  const buildPointFromState = (overrides = {}) => ({
    user: match.user,
    matchIndex: match.matchIndex,
    server,
    firstServeDirection: firstServeDir,
    firstServeOutcome: firstServeOutcome,
    secondServeDirection: secondServeDir,
    secondServeOutcome: secondServeOutcome,
    rallyLength,
    lastShotHand,
    lastShotType,
    outcome,
    outcomeType,
    winner,
    notes,
    tiebreak: isTiebreak ? 'true' : 'false',
    tiebreakType: isTiebreak ? tiebreakType : '7',
    adScoring: match.adScoring,
    // Manual Pre-point overrides:
    setScore1PreOverride: hasOverrides ? overrideSet1 : undefined,
    setScore2PreOverride: hasOverrides ? overrideSet2 : undefined,
    gameScore1PreOverride: hasOverrides ? overrideGame1 : undefined,
    gameScore2PreOverride: hasOverrides ? overrideGame2 : undefined,
    pointScore1PreOverride: hasOverrides ? overridePoint1 : undefined,
    pointScore2PreOverride: hasOverrides ? overridePoint2 : undefined,
    tiebreakOverride: hasOverrides ? (overrideTiebreak ? 'true' : 'false') : undefined,
    // New points capture entry time; edits preserve the original timestamp
    timestamp: isEditMode
      ? (pointsList[editPointIndex]?.timestamp || '')
      : new Date().toISOString(),
    ...overrides,
  });

  const handleSavePoint = async (overrides = {}) => {
    if (savingRef.current) return; // prevent double-tap race
    if (!(overrides.winner || winner)) {
      Alert.alert('Validation Error', 'You must select the point winner.');
      return;
    }

    const newPoint = buildPointFromState(overrides);

    // In edit mode replace the existing point; in add mode append.
    let updatedPointsList;
    if (isEditMode) {
      updatedPointsList = [...pointsList];
      updatedPointsList[editPointIndex] = newPoint;
    } else {
      updatedPointsList = [...pointsList, newPoint];
    }
    const fullyCalculatedPoints = calculateScores(updatedPointsList, 'player1', match.adScoring);

    try {
      savingRef.current = true;
      await savePoints(matchIndex, fullyCalculatedPoints);

      if (isEditMode) {
        // Return to point history — all downstream scores have been recalculated.
        navigation.goBack();
        return;
      }

      // ── Add-mode only: reset form for next point ──
      setFirstServeDir('');
      setFirstServeOutcome('in');
      setSecondServeDir('');
      setSecondServeOutcome('in');
      setLastShotHand('');
      setLastShotType('');
      setOutcome('in');
      setOutcomeType('');
      setWinner('');
      setWinnerManuallySet(false);
      setNotes('');
      setHasOverrides(false);

      const freshPoints = await getPoints(matchIndex);
      setPointsList(freshPoints);
      calculateNextPointScores(match, freshPoints);
      setRallyLength(calcAverageRallyLength(freshPoints));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // Score updates in the UI automatically via calculateNextPointScores above.
    } catch (error) {
      Alert.alert('Error', 'Failed to save point.');
    } finally {
      savingRef.current = false;
    }
  };

  const handleUndoLastPoint = async () => {
    if (pointsList.length === 0) return;
    if (savingRef.current) return; // prevent concurrent undo/save races

    Alert.alert(
      'Undo Point',
      'Are you sure you want to delete the last charted point?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Undo', 
          style: 'destructive',
          onPress: async () => {
            const updatedPointsList = pointsList.slice(0, -1);
            const recalculatedPoints = calculateScores(updatedPointsList, 'player1', match.adScoring);
            try {
              savingRef.current = true;
              await savePoints(matchIndex, recalculatedPoints);
              const freshPoints = await getPoints(matchIndex);
              setPointsList(freshPoints);
              calculateNextPointScores(match, freshPoints);
              // Update rally length default to new average after undo
              setRallyLength(calcAverageRallyLength(freshPoints));
            } catch (e) {
              Alert.alert('Error', 'Failed to undo point.');
            } finally {
              savingRef.current = false;
            }
          }
        }
      ]
    );
  };

  const handleDeletePoint = () => {
    Alert.alert(
      'Delete Point',
      `Are you sure you want to delete Point ${editPointIndex + 1}? All subsequent scores will be recalculated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              savingRef.current = true;
              const updatedPointsList = pointsList.filter((_, i) => i !== editPointIndex);
              const fullyCalculatedPoints = calculateScores(updatedPointsList, 'player1', match.adScoring);
              await savePoints(matchIndex, fullyCalculatedPoints);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete point.');
            } finally {
              savingRef.current = false;
            }
          },
        },
      ]
    );
  };

  // Quick-log shortcuts: aces and double faults fully determine every other
  // field on the point, so save immediately instead of making the user tap
  // through 7 more cards for the most common outcomes.
  const handleQuickAce = () => {
    handleSavePoint({
      winner: server,
      firstServeOutcome: 'ace',
      secondServeOutcome: 'in',
      secondServeDirection: '',
      rallyLength: 1,
      lastShotType: 'serve',
      lastShotHand: '',
      outcome: 'in',
      outcomeType: 'winner',
    });
  };

  const handleQuickDoubleFault = () => {
    const receiver = server === 'player1' ? 'player2' : 'player1';
    handleSavePoint({
      winner: receiver,
      firstServeOutcome: 'net',
      secondServeOutcome: 'net',
      rallyLength: 0,
      lastShotType: 'serve',
      lastShotHand: '',
      outcome: 'out',
      outcomeType: 'unforced error',
    });
  };

  const showSecondServe = firstServeOutcome === 'out' || firstServeOutcome === 'net';
  // Once an ace or double fault is set, last-shot/outcome details are already
  // fully determined — hide those cards instead of leaving dead scrolling.
  const outcomeFullyDetermined =
    firstServeOutcome === 'ace' ||
    secondServeOutcome === 'ace' ||
    secondServeOutcome === 'out' ||
    secondServeOutcome === 'net';

  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </HapticButton>
          <Text style={styles.headerTitle}>
            {isEditMode ? `Edit Point ${editPointIndex + 1}` : `Chart Point ${pointsList.length + 1}`}
          </Text>
          {isEditMode ? (
            <View style={{ width: 40 }} />
          ) : (
            <HapticButton 
              onPress={handleUndoLastPoint} 
              style={[styles.undoButton, pointsList.length === 0 && styles.disabledButton]}
              disabled={pointsList.length === 0}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={pointsList.length === 0 ? '#9CA3AF' : '#EF4444'} />
            </HapticButton>
          )}
        </View>

        {/* Live scores banner (Clickable to Adjust Score) */}
        <TouchableOpacity onPress={handleOpenAdjustScoreModal} style={styles.scoreBanner} activeOpacity={0.8}>
          <Text style={styles.scoreBannerText}>
            Sets: {setScore1}-{setScore2} | Games: {gameScore1}-{gameScore2} | Point: {pointScore1}-{pointScore2}
          </Text>
          <Text style={styles.scoreBannerSubText}>Tap to Adjust Score</Text>
        </TouchableOpacity>

        {/* Adjust Score Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Adjust Match Score</Text>
              
              <ScrollView style={styles.modalForm}>
                {/* 1. Sets */}
                <Text style={styles.modalLabel}>Set Score</Text>
                <View style={styles.stepperRow}>
                  <View style={styles.stepperContainer}>
                    <Text style={styles.stepperLabel}>{match.player1}</Text>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity 
                        onPress={() => setOverrideSet1(prev => Math.max(0, prev - 1))}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{overrideSet1}</Text>
                      <TouchableOpacity 
                        onPress={() => setOverrideSet1(prev => prev + 1)}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.stepperContainer}>
                    <Text style={styles.stepperLabel}>{match.player2}</Text>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity 
                        onPress={() => setOverrideSet2(prev => Math.max(0, prev - 1))}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{overrideSet2}</Text>
                      <TouchableOpacity 
                        onPress={() => setOverrideSet2(prev => prev + 1)}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 2. Games */}
                <Text style={styles.modalLabel}>Game Score</Text>
                <View style={styles.stepperRow}>
                  <View style={styles.stepperContainer}>
                    <Text style={styles.stepperLabel}>{match.player1}</Text>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity 
                        onPress={() => setOverrideGame1(prev => Math.max(0, prev - 1))}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{overrideGame1}</Text>
                      <TouchableOpacity 
                        onPress={() => setOverrideGame1(prev => prev + 1)}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.stepperContainer}>
                    <Text style={styles.stepperLabel}>{match.player2}</Text>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity 
                        onPress={() => setOverrideGame2(prev => Math.max(0, prev - 1))}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{overrideGame2}</Text>
                      <TouchableOpacity 
                        onPress={() => setOverrideGame2(prev => prev + 1)}
                        style={styles.stepperButton}
                      >
                        <Text style={styles.stepperButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 3. Tiebreak Toggle */}
                <View style={styles.modalSwitchRow}>
                  <Text style={styles.modalLabel}>Is Tiebreak Active?</Text>
                  <Switch
                    value={overrideTiebreak}
                    onValueChange={(val) => {
                      setOverrideTiebreak(val);
                      // Reset points override to standard defaults based on switch
                      if (val) {
                        setOverridePoint1('0');
                        setOverridePoint2('0');
                      } else {
                        setOverridePoint1('0');
                        setOverridePoint2('0');
                      }
                    }}
                    trackColor={{ false: '#767577', true: '#3B82F6' }}
                    thumbColor={overrideTiebreak ? '#FFFFFF' : '#f4f3f4'}
                  />
                </View>

                {/* 4. Points */}
                <Text style={styles.modalLabel}>Point Score</Text>
                {overrideTiebreak ? (
                  /* Tiebreak point controls (numeric) */
                  <View style={styles.stepperRow}>
                    <View style={styles.stepperContainer}>
                      <Text style={styles.stepperLabel}>{match.player1}</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity 
                          onPress={() => setOverridePoint1(prev => String(Math.max(0, parseInt(prev || 0) - 1)))}
                          style={styles.stepperButton}
                        >
                          <Text style={styles.stepperButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{overridePoint1}</Text>
                        <TouchableOpacity 
                          onPress={() => setOverridePoint1(prev => String(parseInt(prev || 0) + 1))}
                          style={styles.stepperButton}
                        >
                          <Text style={styles.stepperButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.stepperContainer}>
                      <Text style={styles.stepperLabel}>{match.player2}</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity 
                          onPress={() => setOverridePoint2(prev => String(Math.max(0, parseInt(prev || 0) - 1)))}
                          style={styles.stepperButton}
                        >
                          <Text style={styles.stepperButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{overridePoint2}</Text>
                        <TouchableOpacity 
                          onPress={() => setOverridePoint2(prev => String(parseInt(prev || 0) + 1))}
                          style={styles.stepperButton}
                        >
                          <Text style={styles.stepperButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* Standard point controls (Segmented) */
                  <View style={styles.pointsSegmentContainer}>
                    <SegmentedControl
                      label={`${match.player1} Point`}
                      options={[
                        { label: '0', value: '0' },
                        { label: '15', value: '15' },
                        { label: '30', value: '30' },
                        { label: '40', value: '40' },
                        { label: 'Ad', value: 'ad' }
                      ]}
                      selectedValue={overridePoint1}
                      onValueChange={setOverridePoint1}
                    />
                    <SegmentedControl
                      label={`${match.player2} Point`}
                      options={[
                        { label: '0', value: '0' },
                        { label: '15', value: '15' },
                        { label: '30', value: '30' },
                        { label: '40', value: '40' },
                        { label: 'Ad', value: 'ad' }
                      ]}
                      selectedValue={overridePoint2}
                      onValueChange={setOverridePoint2}
                    />
                  </View>
                )}
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleApplyAdjustments}
                  style={[styles.modalButton, styles.modalButtonApply]}
                >
                  <Text style={styles.modalButtonApplyText}>Apply Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

          {/* 0. Tiebreak format selector — only visible during a tiebreak */}
          {isTiebreak && (
            <Card style={[styles.card, styles.tiebreakCard]}>
              <Text style={styles.tiebreakCardTitle}>⚡ Tiebreak Active</Text>
              <SegmentedControl
                label="Tiebreak Format"
                options={[
                  { label: '7-Point', value: '7' },
                  { label: '10-Point (Super)', value: '10' },
                ]}
                selectedValue={tiebreakType}
                onValueChange={setTiebreakType}
              />
            </Card>
          )}
          {/* 1. Server selection override */}
          <Card style={styles.card}>
            <SegmentedControl
              label="Serving Player"
              options={[
                { label: match.player1, value: 'player1' },
                { label: match.player2, value: 'player2' }
              ]}
              selectedValue={server}
              onValueChange={setServer}
            />
          </Card>

          {/* 1b. Quick-log shortcuts for the two most common point endings */}
          <View style={styles.quickLogRow}>
            <HapticButton onPress={handleQuickAce} style={[styles.quickLogButton, styles.quickLogAce]}>
              <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.quickLogButtonText}>Ace</Text>
            </HapticButton>
            <HapticButton onPress={handleQuickDoubleFault} style={[styles.quickLogButton, styles.quickLogDoubleFault]}>
              <Ionicons name="close-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.quickLogButtonText}>Double Fault</Text>
            </HapticButton>
          </View>

          {/* 2. First Serve */}
          <Card style={styles.card}>
            <Text style={styles.sectionHeader}>First Serve</Text>
            <SegmentedControl
              label="Serve Direction"
              options={[
                { label: 'Wide', value: 'wide' },
                { label: 'Body', value: 'body' },
                { label: 'T', value: 't' }
              ]}
              selectedValue={firstServeDir}
              onValueChange={setFirstServeDir}
            />
            <SegmentedControl
              label="Serve Outcome"
              options={[
                { label: 'In', value: 'in' },
                { label: 'Out', value: 'out' },
                { label: 'Net', value: 'net' },
                { label: 'Let', value: 'let' },
                { label: 'Ace', value: 'ace' }
              ]}
              selectedValue={firstServeOutcome}
              onValueChange={setFirstServeOutcome}
            />
          </Card>

          {/* 3. Second Serve (Conditional) */}
          {showSecondServe && (
            <Card style={styles.card}>
              <Text style={styles.sectionHeader}>Second Serve</Text>
              <SegmentedControl
                label="Serve Direction"
                options={[
                  { label: 'Wide', value: 'wide' },
                  { label: 'Body', value: 'body' },
                  { label: 'T', value: 't' }
                ]}
                selectedValue={secondServeDir}
                onValueChange={setSecondServeDir}
              />
              <SegmentedControl
                label="Serve Outcome"
                options={[
                  { label: 'In', value: 'in' },
                  { label: 'Out', value: 'out' },
                  { label: 'Net', value: 'net' },
                  { label: 'Let', value: 'let' },
                  { label: 'Ace', value: 'ace' }
                ]}
                selectedValue={secondServeOutcome}
                onValueChange={setSecondServeOutcome}
              />
            </Card>
          )}

          {/* 4. Rally Length */}
          <Card style={styles.card}>
            <RallySelector value={rallyLength} onChange={setRallyLength} />
          </Card>

          {/* 5. Last Shot details — hidden once an ace/double fault already fully determines it */}
          {!outcomeFullyDetermined && (
            <Card style={styles.card}>
              <Text style={styles.sectionHeader}>Last Shot Details</Text>
              <SegmentedControl
                label="Last Shot Hand"
                options={[
                  { label: 'Forehand', value: 'forehand' },
                  { label: 'Backhand', value: 'backhand' }
                ]}
                selectedValue={lastShotHand}
                onValueChange={setLastShotHand}
              />
              <SegmentedControl
                label="Last Shot Type"
                options={[
                  { label: 'Serve', value: 'serve' },
                  { label: 'Volley', value: 'volley' },
                  { label: 'Slice', value: 'slice' },
                  { label: 'Smash', value: 'overhead' },
                  { label: 'Drop', value: 'dropshot' },
                  { label: 'Lob', value: 'lob' },
                  { label: 'Pass', value: 'passing' }
                ]}
                selectedValue={lastShotType}
                onValueChange={setLastShotType}
              />
            </Card>
          )}

          {/* 6. Outcome Details — hidden once an ace/double fault already fully determines it */}
          {!outcomeFullyDetermined && (
            <Card style={styles.card}>
              <Text style={styles.sectionHeader}>Point Resolution</Text>
              <SegmentedControl
                label="Shot Result"
                options={[
                  { label: 'In', value: 'in' },
                  { label: 'Out', value: 'out' },
                  { label: 'Net', value: 'net' }
                ]}
                selectedValue={outcome}
                onValueChange={setOutcome}
              />
              <SegmentedControl
                label="Classification"
                options={[
                  { label: 'Winner', value: 'winner' },
                  { label: 'Unforced Error', value: 'unforced error' },
                  { label: 'Forced Error', value: 'forced error' }
                ]}
                selectedValue={outcomeType}
                onValueChange={setOutcomeType}
              />
            </Card>
          )}

          {/* 7. REQUIRED: Winner of point */}
          <Card style={[styles.card, styles.winnerCard]}>
            <SegmentedControl
              label="Point Winner (REQUIRED)"
              options={[
                { label: `${match.player1} Wins`, value: 'player1' },
                { label: `${match.player2} Wins`, value: 'player2' }
              ]}
              selectedValue={winner}
              onValueChange={(val) => {
                setWinner(val);
                setWinnerManuallySet(true); // user explicitly chose — lock it
              }}
            />
          </Card>

          {/* 8. Point notes */}
          <Card style={styles.card}>
            <Text style={styles.label}>Point Notes</Text>
            <TextInput 
              style={styles.input} 
              value={notes} 
              onChangeText={setNotes}
              placeholder="e.g. Unbelievable defensive lob winner..."
            />
          </Card>

          <HapticButton onPress={handleSavePoint} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{isEditMode ? 'Update Point' : 'Save Point'}</Text>
          </HapticButton>
          {isEditMode && (
            <HapticButton onPress={handleDeletePoint} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.deleteButtonText}>Delete Point</Text>
            </HapticButton>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  },
  undoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  scoreBanner: {
    backgroundColor: '#3B82F6', // Blue-500
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreBannerSubText: {
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingBottom: 50,
  },
  card: {
    marginBottom: 12,
    padding: 12,
  },
  quickLogRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickLogButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  quickLogAce: {
    backgroundColor: '#F59E0B', // amber-500
  },
  quickLogDoubleFault: {
    backgroundColor: '#EF4444', // red-500
  },
  quickLogButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  tiebreakCard: {
    borderWidth: 1.5,
    borderColor: '#6366F1', // indigo accent to highlight tiebreak state
    backgroundColor: '#EEF2FF', // indigo-50
  },
  tiebreakCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338CA', // indigo-700
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingBottom: 4,
  },
  winnerCard: {
    borderColor: '#10B981',
    borderWidth: 1,
    backgroundColor: '#ECFDF5',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
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
  saveButton: {
    backgroundColor: '#10B981', // Emerald green
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalForm: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepperContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    textAlign: 'center',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButton: {
    width: 32,
    height: 32,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  modalSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pointsSegmentContainer: {
    marginTop: -8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  modalButtonCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalButtonCancelText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  modalButtonApply: {
    backgroundColor: '#3B82F6', // Blue-500
  },
  modalButtonApplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
