import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticButton from './HapticButton';

export default function SegmentedControl({ 
  options, 
  selectedValue, 
  onValueChange, 
  label,
  containerStyle
}) {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.labelText}>{label}</Text>}
      <View style={styles.container}>
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <HapticButton
              key={opt.value}
              onPress={() => onValueChange(opt.value)}
              style={[
                styles.segment, 
                isSelected && styles.segmentSelected
              ]}
            >
              <Text 
                style={[
                  styles.segmentText, 
                  isSelected && styles.segmentTextSelected
                ]}
              >
                {opt.label}
              </Text>
            </HapticButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    width: '100%',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563', // Gray-600
    marginBottom: 6,
    paddingLeft: 4,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6', // Gray-100
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280', // Gray-500
  },
  segmentTextSelected: {
    color: '#111827', // Gray-900
    fontWeight: '700',
  },
});
