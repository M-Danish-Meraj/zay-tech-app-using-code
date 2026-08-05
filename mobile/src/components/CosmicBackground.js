import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../styles/theme';

export const CosmicBackground = ({ children }) => {
  return (
    <LinearGradient
      colors={[COLORS.spaceDark, COLORS.spaceNavy, COLORS.spacePurple]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative stars / glows */}
      <View style={[styles.glowRing, styles.glowPink, { top: -100, right: -100 }]} />
      <View style={[styles.glowRing, styles.glowBlue, { bottom: -150, left: -150 }]} />
      
      <View style={styles.content}>
        {children}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  glowRing: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.12,
  },
  glowPink: {
    backgroundColor: COLORS.spacePink,
  },
  glowBlue: {
    backgroundColor: COLORS.spaceBlue,
  },
});
export default CosmicBackground;
