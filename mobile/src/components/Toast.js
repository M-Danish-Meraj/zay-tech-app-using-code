import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, SafeAreaView } from 'react-native';
import { COLORS, SHADOWS } from '../styles/theme';

export const Toast = ({ message, visible, onHide, type = 'success' }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const isError = type === 'error';

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        SHADOWS.glass,
        {
          transform: [{ translateY: slideAnim }],
          borderColor: isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(244, 114, 182, 0.4)',
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <Text style={[styles.toastText, { color: isError ? COLORS.red : COLORS.slate100 }]}>
          {isError ? '⚠️ ' : '✨ '}
          {message}
        </Text>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: 'rgba(10, 10, 22, 0.9)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  safeArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
export default Toast;
