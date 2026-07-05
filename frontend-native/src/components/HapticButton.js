import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function HapticButton({ 
  onPress, 
  children, 
  style, 
  feedbackStyle = Haptics.ImpactFeedbackStyle.Light,
  disabled = false,
  ...props 
}) {
  const handlePress = () => {
    if (disabled) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(feedbackStyle).catch(() => {});
    
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={[style, disabled && styles.disabled]} 
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
