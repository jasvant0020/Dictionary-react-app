import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const STATUS_MESSAGES = {
  initializing: 'Starting up...',
  loading: 'Loading Oxford Dictionary...',
  indexing: 'Building search index...',
  ready: 'Ready!',
  error: 'Something went wrong',
};

export default function LoadingScreen({ status, progress, error, retry }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const styles = getStyles(c);

  return (
    <View style={styles.container}>
      <StatusBar style={theme.colors.statusBar} />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo area */}
        <Animated.View style={[styles.logoContainer, { opacity: pulseAnim }]}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Text style={styles.logoLetter}>O</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.appName}>Oxford Dictionary</Text>
        <Text style={styles.tagline}>The definitive record of the English language</Text>

        <View style={styles.progressSection}>
          <Text style={styles.statusText}>
            {error ? error : STATUS_MESSAGES[status] || 'Loading...'}
          </Text>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: barWidth }]} />
          </View>

          {progress > 0 && !error && (
            <Text style={styles.progressLabel}>{Math.round(progress)}%</Text>
          )}

          {error && (
            <Text style={styles.retryBtn} onPress={retry}>
              Tap to retry
            </Text>
          )}
        </View>
      </Animated.View>

      <Text style={styles.footer}>Aurora Paper · Ember Pro</Text>
    </View>
  );
}

const getStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 28,
  },
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: c.text,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    color: c.muted,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 20,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: c.muted,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: c.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: c.muted,
    marginTop: 10,
  },
  retryBtn: {
    fontSize: 14,
    color: c.primary,
    marginTop: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: c.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
