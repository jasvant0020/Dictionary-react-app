import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { getTotalEntries, getFavoritesCount, getBookmarks, getAppState } from '../database/db';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation, totalEntries }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const c = theme.colors;
  const [stats, setStats] = useState({ entries: totalEntries, favorites: 0, bookmarks: 0 });
  const [lastWord, setLastWord] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadStats();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadStats = async () => {
    const [entries, favorites, bookmarks, pos] = await Promise.all([
      getTotalEntries(),
      getFavoritesCount(),
      getBookmarks(),
      getAppState('last_position'),
    ]);
    setStats({ entries, favorites, bookmarks: bookmarks.length });
    if (pos?.word) setLastWord(pos.word);
  };

  const styles = getStyles(c);

  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value?.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const NavButton = ({ icon, label, sub, onPress, color, accent }) => (
    <TouchableOpacity
      style={[styles.navBtn, { borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.navBtnIcon, { backgroundColor: accent || c.surface }]}>
        <Ionicons name={icon} size={24} color={color || c.primary} />
      </View>
      <View style={styles.navBtnText}>
        <Text style={styles.navBtnLabel}>{label}</Text>
        {sub ? <Text style={styles.navBtnSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.muted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={c.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Oxford Dictionary</Text>
          <Text style={styles.subtitle}>{theme.name}</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn} activeOpacity={0.7}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero Banner */}
          <View style={[styles.hero, { backgroundColor: c.primary }]}>
            <View style={styles.heroContent}>
              <View style={styles.heroLogo}>
                <Text style={styles.heroLetter}>O</Text>
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>The English Dictionary</Text>
                <Text style={styles.heroSub}>Complete offline reference</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <StatCard icon="book-outline" label="Words" value={stats.entries} color={c.primary} />
            <StatCard icon="heart" label="Favorites" value={stats.favorites} color={c.favActive} />
            <StatCard icon="bookmark" label="Bookmarks" value={stats.bookmarks} color={c.secondary} />
          </View>

          {/* Continue Reading */}
          {lastWord && (
            <TouchableOpacity
              style={styles.continueCard}
              onPress={() => navigation.navigate('Reader', { mode: 'continuous', resumeWord: lastWord })}
              activeOpacity={0.8}
            >
              <View style={[styles.continueDot, { backgroundColor: c.accent }]} />
              <View style={styles.continueText}>
                <Text style={styles.continueLabel}>Continue Reading</Text>
                <Text style={styles.continueWord} numberOfLines={1}>{lastWord}</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color={c.accent} />
            </TouchableOpacity>
          )}

          {/* Main Navigation */}
          <Text style={styles.sectionTitle}>Explore</Text>

          <NavButton
            icon="search"
            label="Search Dictionary"
            sub="Prefix, partial, meaning search"
            onPress={() => navigation.navigate('SearchTab')}
            color={c.primary}
            accent={c.highlight}
          />
          <NavButton
            icon="book"
            label="Continuous Reader"
            sub="Scroll through all entries"
            onPress={() => navigation.navigate('Reader', { mode: 'continuous' })}
            color={c.secondary}
            accent={isDark ? '#001A2A' : '#ECFEFF'}
          />
          <NavButton
            icon="albums"
            label="Page Reader"
            sub="Swipe through pages"
            onPress={() => navigation.navigate('Reader', { mode: 'pages' })}
            color={c.accent}
            accent={isDark ? '#002A25' : '#F0FFFE'}
          />
          <NavButton
            icon="heart"
            label="My Favorites"
            sub={`${stats.favorites} saved words`}
            onPress={() => navigation.navigate('Favorites')}
            color={c.favActive}
            accent={isDark ? '#2A0010' : '#FFF1F2'}
          />
          <NavButton
            icon="bookmark"
            label="Bookmarks"
            sub={`${stats.bookmarks} reading positions`}
            onPress={() => navigation.navigate('Bookmarks')}
            color={c.secondary}
            accent={isDark ? '#001A2A' : '#ECFEFF'}
          />
          <NavButton
            icon="settings-outline"
            label="Settings"
            sub="Theme, font size, preferences"
            onPress={() => navigation.navigate('Settings')}
            color={c.muted}
            accent={c.surface}
          />

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: c.primary, fontWeight: '600', marginTop: 2 },
  themeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  hero: {
    borderRadius: 18, padding: 20, marginBottom: 16,
    overflow: 'hidden',
  },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroLogo: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLetter: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  statsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  statCard: {
    flex: 1, backgroundColor: c.card, borderRadius: 12,
    padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: c.border,
    borderLeftWidth: 3,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: c.text },
  statLabel: { fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  continueCard: {
    backgroundColor: c.card, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 20, borderWidth: 1, borderColor: c.border,
  },
  continueDot: { width: 10, height: 10, borderRadius: 5 },
  continueText: { flex: 1 },
  continueLabel: { fontSize: 12, color: c.muted, marginBottom: 2 },
  continueWord: { fontSize: 16, fontWeight: '600', color: c.text },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: c.muted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, marginTop: 4,
  },
  navBtn: {
    backgroundColor: c.card, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 8, borderWidth: 1,
  },
  navBtnIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnText: { flex: 1 },
  navBtnLabel: { fontSize: 15, fontWeight: '600', color: c.text },
  navBtnSub: { fontSize: 12, color: c.muted, marginTop: 2 },
});
