import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import {
  getEntriesPaginated, getTotalEntries, addBookmark,
  getBookmarks, setAppState, getAppState
} from '../database/db';
import EntryCard from '../components/EntryCard';

const PAGE_SIZE = 40;

export default function ContinuousReaderScreen({ navigation, route }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { resumeWord } = route?.params || {};

  const [entries, setEntries] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [currentVisibleWord, setCurrentVisibleWord] = useState('');
  const [currentEntryNumber, setCurrentEntryNumber] = useState(0);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpLetter, setJumpLetter] = useState('');
  const flatListRef = useRef(null);
  const headerFadeAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const total = await getTotalEntries();
    setTotalEntries(total);
    const initialData = await getEntriesPaginated(0, PAGE_SIZE);
    setEntries(initialData);
    setCurrentOffset(PAGE_SIZE);
    setHasMore(initialData.length === PAGE_SIZE);
    setInitializing(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const newEntries = await getEntriesPaginated(currentOffset, PAGE_SIZE);
      if (newEntries.length < PAGE_SIZE) setHasMore(false);
      setEntries(prev => [...prev, ...newEntries]);
      setCurrentOffset(prev => prev + PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentOffset]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const first = viewableItems[0].item;
      setCurrentVisibleWord(first.word);
      setCurrentEntryNumber(first.entry_number);
    }
  }, []);

  const saveReadingPosition = useCallback(async () => {
    if (currentVisibleWord) {
      await setAppState('last_position', {
        word: currentVisibleWord,
        entryNumber: currentEntryNumber
      });
    }
  }, [currentVisibleWord, currentEntryNumber]);

  useEffect(() => {
    const interval = setInterval(saveReadingPosition, 5000);
    return () => clearInterval(interval);
  }, [saveReadingPosition]);

  const handleScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;
    if (Math.abs(dy) > 5) {
      Animated.timing(headerFadeAnim, {
        toValue: dy > 0 ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const saveBookmark = async () => {
    await addBookmark(
      bookmarkName || `Bookmark: ${currentVisibleWord}`,
      currentEntryNumber,
      currentVisibleWord,
      'continuous'
    );
    setShowBookmarkModal(false);
    setBookmarkName('');
    Alert.alert('Saved!', `Bookmark saved at "${currentVisibleWord}"`);
  };

  const renderItem = useCallback(({ item }) => (
    <EntryCard entry={item} style={{ marginHorizontal: 16 }} />
  ), []);

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={c.primary} />
        <Text style={[styles.loadingMoreText, { color: c.muted }]}>Loading more entries...</Text>
      </View>
    );
  };

  const styles = getStyles(c);

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  if (initializing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.muted }]}>Opening dictionary...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={theme.colors.statusBar} />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentVisibleWord || 'Dictionary'}
          </Text>
          <Text style={styles.headerSub}>
            {currentEntryNumber + 1} / {totalEntries.toLocaleString()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowJumpModal(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="locate-outline" size={20} color={c.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowBookmarkModal(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="bookmark-outline" size={20} color={c.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[
          styles.progressBar,
          {
            width: `${totalEntries > 0 ? Math.min(100, (currentEntryNumber / totalEntries) * 100) : 0}%`,
            backgroundColor: c.primary
          }
        ]} />
      </View>

      <FlatList
        ref={flatListRef}
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={20}
        removeClippedSubviews={true}
        getItemLayout={undefined}
      />

      {/* Bookmark Modal */}
      <Modal visible={showBookmarkModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Bookmark</Text>
            <Text style={styles.modalSub}>Currently at: <Text style={{ color: c.primary }}>{currentVisibleWord}</Text></Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Bookmark name (optional)"
              placeholderTextColor={c.muted}
              value={bookmarkName}
              onChangeText={setBookmarkName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowBookmarkModal(false)} style={styles.modalCancel}>
                <Text style={[styles.modalCancelText, { color: c.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBookmark} style={[styles.modalSave, { backgroundColor: c.primary }]}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Jump to Letter Modal */}
      <Modal visible={showJumpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Jump to Letter</Text>
            <View style={styles.alphabetGrid}>
              {ALPHABET.map(letter => (
                <TouchableOpacity
                  key={letter}
                  style={[
                    styles.letterBtn,
                    { backgroundColor: jumpLetter === letter ? c.primary : c.surface }
                  ]}
                  onPress={() => setJumpLetter(letter)}
                >
                  <Text style={[
                    styles.letterBtnText,
                    { color: jumpLetter === letter ? '#fff' : c.text }
                  ]}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowJumpModal(false)} style={styles.modalCancel}>
                <Text style={[styles.modalCancelText, { color: c.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!jumpLetter) return;
                  const { searchEntries } = await import('../database/db');
                  const res = await searchEntries(jumpLetter, 1);
                  if (res.length > 0) {
                    const idx = entries.findIndex(e => e.id === res[0].id);
                    if (idx >= 0) {
                      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                    }
                  }
                  setShowJumpModal(false);
                  setJumpLetter('');
                }}
                style={[styles.modalSave, { backgroundColor: c.primary }]}
              >
                <Text style={styles.modalSaveText}>Jump</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: c.headerBg,
    borderBottomWidth: 1, borderBottomColor: c.border,
    gap: 8,
  },
  backBtn: { padding: 6, borderRadius: 10 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: c.text },
  headerSub: { fontSize: 11, color: c.muted, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surface,
  },

  progressTrack: { height: 2, backgroundColor: c.border },
  progressBar: { height: '100%' },

  listContent: { paddingTop: 12, paddingBottom: 40 },

  loadingMore: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, flexDirection: 'row', gap: 10,
  },
  loadingMoreText: { fontSize: 13 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 6 },
  modalSub: { fontSize: 13, color: c.muted, marginBottom: 16 },
  modalInput: {
    backgroundColor: c.searchBg, borderRadius: 12, padding: 14,
    fontSize: 15, color: c.text, marginBottom: 16,
    borderWidth: 1, borderColor: c.border,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    backgroundColor: c.surface, borderRadius: 12,
    borderWidth: 1, borderColor: c.border,
  },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalSave: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: 12,
  },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  alphabetGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20,
  },
  letterBtn: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  letterBtnText: { fontSize: 16, fontWeight: '600' },
});
