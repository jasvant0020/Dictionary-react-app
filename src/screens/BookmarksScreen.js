import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getBookmarks, removeBookmark } from '../database/db';

export default function BookmarksScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [bookmarks, setBookmarks] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const loadBookmarks = async () => {
    const bm = await getBookmarks();
    setBookmarks(bm);
  };

  const handleDelete = (id, name) => {
    Alert.alert('Delete Bookmark', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await removeBookmark(id);
          loadBookmarks();
        }
      }
    ]);
  };

  const handleOpen = (bm) => {
    const mode = bm.mode || 'continuous';
    navigation.navigate('Reader', {
      mode,
      resumeWord: bm.word,
      entryNumber: bm.entry_number,
    });
  };

  const styles = getStyles(c);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleOpen(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.highlight }]}>
        <Ionicons
          name={item.mode === 'pages' ? 'albums' : 'book'}
          size={22}
          color={c.primary}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.word} numberOfLines={1}>
          <Text style={{ color: c.primary }}>@</Text> {item.word}
        </Text>
        <Text style={styles.meta}>
          {item.mode === 'pages' ? 'Page Reader' : 'Continuous Reader'} ·{' '}
          {new Date(item.created_at * 1000).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDelete(item.id, item.name)}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={c.muted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surface }]}>
        <Ionicons name="bookmark-outline" size={40} color={c.muted} />
      </View>
      <Text style={styles.emptyTitle}>No bookmarks yet</Text>
      <Text style={styles.emptySub}>
        While reading, tap the bookmark icon to save your position
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={theme.colors.statusBar} />

      <View style={styles.header}>
        <Text style={styles.title}>Bookmarks</Text>
        <Text style={styles.count}>{bookmarks.length} saved</Text>
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          bookmarks.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
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
  title: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
  count: { fontSize: 13, color: c.muted, fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  card: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '600', color: c.text },
  word: { fontSize: 13, color: c.muted },
  meta: { fontSize: 11, color: c.muted, marginTop: 2 },
  deleteBtn: { padding: 6 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  emptySub: {
    fontSize: 13,
    color: c.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
