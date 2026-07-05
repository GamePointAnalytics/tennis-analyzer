import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticButton from './HapticButton';

export default function RallySelector({ value, onChange, label = "Rally Length (Shot Count, serve included)" }) {
  const increment = () => onChange(value + 1);
  const decrement = () => onChange(Math.max(0, value - 1));

  return (
    <View style={styles.container}>
      <Text style={styles.labelText}>{label}</Text>
      <View style={styles.selectorRow}>
        <HapticButton 
          onPress={decrement} 
          style={styles.button}
          disabled={value === 0}
        >
          <Text style={styles.buttonText}>-</Text>
        </HapticButton>
        
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.subText}>{value === 1 ? 'shot' : 'shots'}</Text>
        </View>

        <HapticButton onPress={increment} style={styles.button}>
          <Text style={styles.buttonText}>+</Text>
        </HapticButton>
      </View>
      
      {/* Quick preset buttons */}
      <View style={styles.presetsRow}>
        {[1, 3, 5, 8, 12].map((preset) => (
          <HapticButton
            key={preset}
            onPress={() => onChange(preset)}
            style={[
              styles.presetButton,
              value === preset && styles.presetButtonActive
            ]}
          >
            <Text 
              style={[
                styles.presetButtonText,
                value === preset && styles.presetButtonTextActive
              ]}
            >
              {preset}
            </Text>
          </HapticButton>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
    paddingLeft: 4,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 6,
    height: 70,
  },
  button: {
    width: 58,
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  valueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subText: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: -2,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  presetButton: {
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#3B82F6', // Blue-500
    borderColor: '#3B82F6',
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },
});
