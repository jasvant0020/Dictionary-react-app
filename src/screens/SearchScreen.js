import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Keyboard,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { searchEntries } from '../database/db';
import EntryCard from '../components/EntryCard';

const DEBOUNCE_MS = 250;

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchEntries(q.trim(), 60);
      setResults(res);
      setSearched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), DEBOUNCE_MS);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const styles = getStyles(c);

  const renderHeader = () => (
    <View>
      {/* Search Tips when empty */}
      {!searched && !loading && (
        <Animated.View style={[styles.tipsContainer, { opacity: fadeAnim }]}>
          <Text style={styles.tipsTitle}>Search Tips</Text>
          {[
            { icon: 'flash-outline', tip: 'Type any word for instant results' },
            { icon: 'search-outline', tip: 'Partial match: "rupt" finds disrupt, corrupt' },
            { icon: 'document-text-outline', tip: 'Search meanings: "large mammal"' },
            { icon: 'text-outline', tip: 'Prefix search: "auto" finds autobiography...' },
          ].map(({ icon, tip }, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name={icon} size={16} color={c.primary} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {searched && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultCount}>
            {results.length === 0
              ? 'No results found'
              : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
          </Text>
          {results.length === 0 && (
            <Text style={styles.noResultSub}>Try a different spelling or broader term</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={theme.colors.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={c.muted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search words, meanings..."
            placeholderTextColor={c.muted}
            value={query}
            onChangeText={handleChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
            clearButtonMode="never"
          />
          {loading ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginRight: 10 }} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={c.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EntryCard entry={item} style={{ marginHorizontal: 16 }} />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const getStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5 },

  searchBarWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.searchBg, borderRadius: 14,
    borderWidth: 1, borderColor: c.border,
    paddingVertical: 4,
  },
  searchIcon: { marginLeft: 14, marginRight: 8 },
  searchInput: {
    flex: 1, fontSize: 16, color: c.text,
    paddingVertical: 10,
  },
  clearBtn: { padding: 10 },

  listContent: { paddingBottom: 40, paddingTop: 4 },

  resultsHeader: { paddingHorizontal: 16, marginBottom: 12 },
  resultCount: { fontSize: 13, color: c.muted, fontWeight: '500' },
  noResultSub: { fontSize: 12, color: c.muted, marginTop: 4 },

  tipsContainer: {
    margin: 16, backgroundColor: c.card,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: c.border,
  },
  tipsTitle: {
    fontSize: 14, fontWeight: '700', color: c.text,
    marginBottom: 14, letterSpacing: -0.2,
  },
  tipRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 10,
  },
  tipText: { fontSize: 13, color: c.muted, flex: 1, lineHeight: 18 },
});
