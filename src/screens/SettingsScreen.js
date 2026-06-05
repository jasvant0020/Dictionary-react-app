import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { getTotalEntries, getFavoritesCount } from '../database/db';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const c = theme.colors;
  const [stats, setStats] = useState({ entries: 0, favorites: 0 });
  const [fontSize, setFontSize] = useState('medium');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [entries, favorites, fs] = await Promise.all([
      getTotalEntries(),
      getFavoritesCount(),
      AsyncStorage.getItem('fontSize'),
    ]);
    setStats({ entries, favorites });
    if (fs) setFontSize(fs);
  };

  const changeFontSize = async (size) => {
    setFontSize(size);
    await AsyncStorage.setItem('fontSize', size);
  };

  const clearFavorites = () => {
    Alert.alert(
      'Clear All Favorites',
      'This will remove all your saved favorites. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive',
          onPress: async () => {
            const { getDB } = await import('../database/db');
            const db = await getDB();
            await db.runAsync('DELETE FROM favorites');
            setStats(s => ({ ...s, favorites: 0 }));
            Alert.alert('Done', 'All favorites cleared.');
          }
        }
      ]
    );
  };

  const clearBookmarks = () => {
    Alert.alert(
      'Clear All Bookmarks',
      'This will remove all your bookmarks. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive',
          onPress: async () => {
            const { getDB } = await import('../database/db');
            const db = await getDB();
            await db.runAsync('DELETE FROM bookmarks');
            Alert.alert('Done', 'All bookmarks cleared.');
          }
        }
      ]
    );
  };

  const styles = getStyles(c);

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row = ({ icon, label, sub, right, onPress, danger, last }) => (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? '#FFF1F2' : c.surface }]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? '#EF4444' : c.primary}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </TouchableOpacity>
  );

  const FONT_SIZES = [
    { key: 'small', label: 'Small', size: 13 },
    { key: 'medium', label: 'Medium', size: 15 },
    { key: 'large', label: 'Large', size: 17 },
    { key: 'xlarge', label: 'X-Large', size: 20 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={theme.colors.statusBar} />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme */}
        <Section title="Appearance">
          <Row
            icon={isDark ? 'moon' : 'sunny'}
            label="Dark Mode"
            sub={isDark ? 'Ember Pro' : 'Aurora Paper'}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor="#FFFFFF"
              />
            }
            last
          />
        </Section>

        {/* Font Size */}
        <Section title="Reading">
          <View style={styles.fontSizeRow}>
            {FONT_SIZES.map(({ key, label, size }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.fontSizeBtn,
                  fontSize === key && {
                    backgroundColor: c.primary,
                    borderColor: c.primary,
                  }
                ]}
                onPress={() => changeFontSize(key)}
              >
                <Text style={[
                  styles.fontSizeBtnText,
                  { fontSize: size - 3 },
                  fontSize === key && { color: '#fff' }
                ]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Dictionary Stats */}
        <Section title="Dictionary">
          <Row
            icon="book-outline"
            label="Total Entries"
            sub="Bundled Oxford Dictionary"
            right={<Text style={styles.statValue}>{stats.entries.toLocaleString()}</Text>}
          />
          <Row
            icon="heart-outline"
            label="Saved Favorites"
            right={<Text style={styles.statValue}>{stats.favorites.toLocaleString()}</Text>}
            last
          />
        </Section>

        {/* Data Management */}
        <Section title="Data">
          <Row
            icon="heart-dislike-outline"
            label="Clear All Favorites"
            sub="Remove all saved words"
            onPress={clearFavorites}
            danger
          />
          <Row
            icon="bookmark-outline"
            label="Clear All Bookmarks"
            sub="Remove all reading positions"
            onPress={clearBookmarks}
            danger
            last
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row
            icon="information-circle-outline"
            label="Version"
            right={<Text style={styles.statValue}>1.0.0</Text>}
          />
          <Row
            icon="color-palette-outline"
            label="Light Theme"
            right={<Text style={styles.statValue}>Aurora Paper</Text>}
          />
          <Row
            icon="flame-outline"
            label="Dark Theme"
            right={<Text style={styles.statValue}>Ember Pro</Text>}
            last
          />
        </Section>

        {/* Theme Preview */}
        <View style={styles.themePreview}>
          <View style={[styles.previewCard, { backgroundColor: '#F7F8FC' }]}>
            <Text style={[styles.previewLabel, { color: '#4F46E5' }]}>Aurora Paper</Text>
            <View style={[styles.previewDot, { backgroundColor: '#4F46E5' }]} />
            <View style={[styles.previewDot, { backgroundColor: '#06B6D4' }]} />
            <View style={[styles.previewDot, { backgroundColor: '#14B8A6' }]} />
          </View>
          <View style={[styles.previewCard, { backgroundColor: '#0F1115' }]}>
            <Text style={[styles.previewLabel, { color: '#FF8A00' }]}>Ember Pro</Text>
            <View style={[styles.previewDot, { backgroundColor: '#FF8A00' }]} />
            <View style={[styles.previewDot, { backgroundColor: '#FFB347' }]} />
            <View style={[styles.previewDot, { backgroundColor: '#FF6B00' }]} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 50 },

  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: c.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: c.text },
  rowSub: { fontSize: 12, color: c.muted, marginTop: 2 },
  statValue: { fontSize: 14, color: c.muted, fontWeight: '500' },

  fontSizeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
  },
  fontSizeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  fontSizeBtnText: {
    fontWeight: '600',
    color: c.text,
  },

  themePreview: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  previewCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  previewDot: {
    width: 28,
    height: 8,
    borderRadius: 4,
  },
});
