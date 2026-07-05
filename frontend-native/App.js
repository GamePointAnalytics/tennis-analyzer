import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Import Screens
import MatchesScreen from './src/screens/MatchesScreen';
import MatchEditorScreen from './src/screens/MatchEditorScreen';
import MatchDetailScreen from './src/screens/MatchDetailScreen';
import PointEditorScreen from './src/screens/PointEditorScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Database Initializer
import { initializeDb } from './src/database/db';
// Sync
import { syncPendingData } from './src/utils/syncManager';

const Stack = createNativeStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const appState = useRef(AppState.currentState);

  // Sync when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        syncPendingData().catch(err => console.warn('Auto-sync on foreground:', err));
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Initialize local database on app start
    initializeDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('Failed to initialize local database:', err);
        setDbReady(true); // fall through, screen errors will handle it
      });
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator 
        initialRouteName="Matches"
        screenOptions={{
          headerShown: false, // Custom header design used inside screens
          contentStyle: { backgroundColor: '#F9FAFB' }
        }}
      >
        <Stack.Screen name="Matches" component={MatchesScreen} />
        <Stack.Screen name="MatchEditor" component={MatchEditorScreen} />
        <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
        <Stack.Screen name="PointEditor" component={PointEditorScreen} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
});
