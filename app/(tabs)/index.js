import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { getCredentials } from '../../services/blurtService';
import AnimatedLogo from '../../components/AnimatedLogo';
import { theme } from '../theme';

export default function SplashScreen() {
  const [loading, setLoading] = useState(true);
  const hasNavigated = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Smooth splash animation delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        const { username, postingKey } = await getCredentials();

        if (hasNavigated.current) return;
        hasNavigated.current = true;

        if (username && postingKey) {
          // ✅ Logged in → Feed
          router.replace('/feed');
        } else {
          // ✅ New user / logged out → Onboarding
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Splash screen error:', error);

        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.replace('/onboarding');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <AnimatedLogo />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.spinner}
          />

          <View style={styles.loadingTextContainer}>
            <View style={styles.loadingDots}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.loadingDot,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: 0.3 + i * 0.3,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.scanline} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: theme.spacing.lg,
  },
  loadingTextContainer: {
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  scanline: {
    width: 100,
    height: 2,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});
