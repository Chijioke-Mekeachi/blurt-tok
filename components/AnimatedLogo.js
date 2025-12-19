import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { theme } from '../app/theme';
import { createPulseAnimation, createTypingAnimation } from '../utils/animations';

const { width, height } = Dimensions.get('window');

const AnimatedLogo = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start pulse animation
    const pulse = createPulseAnimation(pulseAnim, 0.8, 1.2);
    pulse.start();

    // Start scanline animation
    const scanline = Animated.loop(
      Animated.timing(scanlineAnim, {
        toValue: height,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    scanline.start();

    // Start typing animation
    const typing = createTypingAnimation(typingAnim);
    typing.start();

    // Start glow animation
    const glow = createPulseAnimation(glowAnim, 1, 1.5);
    glow.start();

    return () => {
      pulse.stop();
      scanline.stop();
      typing.stop();
      glow.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.scanline,
          {
            transform: [{ translateY: scanlineAnim }],
          },
        ]}
      />
      
      <View style={styles.logoContainer}>
        <Animated.View
          style={[
            styles.logoOuter,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoInner,
              {
                opacity: glowAnim,
              },
            ]}
          >
            <Text style={styles.logoText}>B</Text>
          </Animated.View>
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>BLURTTOK</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>BLOCKCHAIN VIDEO PLATFORM</Text>
            <Animated.View
              style={[
                styles.cursor,
                {
                  opacity: typingAnim,
                },
              ]}
            />
          </View>
        </View>
      </View>
      
      <View style={styles.gridOverlay}>
        {[...Array(10)].map((_, i) => (
          <View key={i} style={styles.gridLine} />
        ))}
      </View>
      
      <View style={styles.hudElements}>
        <View style={styles.hudElement}>
          <View style={styles.hudDot} />
          <Text style={styles.hudText}>BLURT NETWORK</Text>
        </View>
        <View style={styles.hudElement}>
          <View style={[styles.hudDot, { backgroundColor: theme.colors.secondary }]} />
          <Text style={styles.hudText}>DECENTRALIZED</Text>
        </View>
        <View style={styles.hudElement}>
          <View style={[styles.hudDot, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles.hudText}>YOUR CONTENT</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    ...theme.shadows.glow,
  },
  logoInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: theme.colors.background,
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'System',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: theme.spacing.sm,
    textShadowColor: theme.colors.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  cursor: {
    width: 8,
    height: 20,
    backgroundColor: theme.colors.primary,
    marginLeft: 4,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.1,
  },
  gridLine: {
    width: 1,
    backgroundColor: theme.colors.primary,
  },
  hudElements: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  hudElement: {
    alignItems: 'center',
  },
  hudDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  hudText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});

export default AnimatedLogo;