import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getFavorites, searchFavorites, removeFavorite } from '../database/db';

export default function FavoritesScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [favorites, setFavorites] = useState([]);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
    setFiltered(favs);
  };

  const handleSearch = async (text) => {
    setQuery(text);
    if (!text.trim()) {
      setFiltered(favorites);
      return;
    }
    const res = await searchFavorites(text);
    setFiltered(res);
  };

  const handleRemove = (word) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${word}" from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeFavorite(word);
            loadFavorites();
          }
        }
      ]
    );
  };

  const styles = getStyles(c);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.wordRow}>
          <Text style={styles.word} selectable>{item.word}</Text>
          {item.part_of_speech ? (
            <View style={styles.posBadge}>
              <Text style={styles.posText}>{item.part_of_speech}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleRemove(item.word)}
          style={styles.removeBtn}
        >
          <Ionicons name="heart" size={20} color={c.favActive} />
        </TouchableOpacity>
      </View>
      <Text style={styles.definition} selectable>{item.definition}</Text>
      <Text style={styles.date}>
        Saved {new Date(item.created_at * 1000).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surface }]}>
        <Ionicons name="heart-outline" size={40} color={c.muted} />
      </View>
      <Text style={styles.emptyTitle}>
        {query ? 'No matches found' : 'No favorites yet'}
      </Text>
      <Text style={styles.emptySub}>
        {query
          ? 'Try a different search term'
          : 'Tap the heart icon on any entry to save it here'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={theme.colors.statusBar} />

      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.count}>{favorites.length} words</Text>
      </View>

      {favorites.length > 0 && (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={c.muted} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search favorites..."
              placeholderTextColor={c.muted}
              value={query}
              onChangeText={handleSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 10 }}>
                <Ionicons name="close-circle" size={16} color={c.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const getStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
  count: { fontSize: 13, color: c.muted, fontWeight: '500' },

  searchBarWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.searchBg, borderRadius: 12,
    borderWidth: 1, borderColor: c.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: c.text, paddingVertical: 10, paddingHorizontal: 8 },

  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  card: {
    backgroundColor: c.card, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: c.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  word: { fontSize: 19, fontWeight: '700', color: c.wordTitle },
  posBadge: {
    backgroundColor: c.badge, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  posText: { fontSize: 11, fontWeight: '600', color: c.badgeText, fontStyle: 'italic' },
  removeBtn: { padding: 4 },
  definition: { fontSize: 14, color: c.text, lineHeight: 22 },
  date: { fontSize: 11, color: c.muted, marginTop: 8 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  emptySub: { fontSize: 13, color: c.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});
