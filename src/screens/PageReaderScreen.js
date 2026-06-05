import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import PagerView from 'react-native-pager-view';
import { useTheme } from '../context/ThemeContext';
import {
  getEntriesPaginated, getTotalEntries,
  addBookmark, setAppState
} from '../database/db';
import EntryCard from '../components/EntryCard';

const { width, height } = Dimensions.get('window');
const ENTRIES_PER_PAGE = 8;

export default function PageReaderScreen({ navigation, route }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const pagerRef = useRef(null);

  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState([]);
  const [loadedPageRange, setLoadedPageRange] = useState({ start: 0, end: 0 });
  const [initializing, setInitializing] = useState(true);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [showPageJump, setShowPageJump] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [jumpPage, setJumpPage] = useState('');
  const [currentWord, setCurrentWord] = useState('');

  const PRELOAD_PAGES = 3;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const total = await getTotalEntries();
    setTotalEntries(total);
    const tp = Math.ceil(total / ENTRIES_PER_PAGE);
    setTotalPages(tp);

    // Load first few pages
    const initialPages = await loadPageRange(0, Math.min(PRELOAD_PAGES, tp));
    setPages(initialPages);
    setLoadedPageRange({ start: 0, end: initialPages.length - 1 });
    if (initialPages[0]?.length > 0) {
      setCurrentWord(initialPages[0][0].word);
    }
    setInitializing(false);
  };

  const loadPageRange = async (startPage, endPage) => {
    const result = [];
    for (let p = startPage; p < endPage; p++) {
      const offset = p * ENTRIES_PER_PAGE;
      const entries = await getEntriesPaginated(offset, ENTRIES_PER_PAGE);
      result.push(entries);
    }
    return result;
  };

  const onPageSelected = useCallback(async (e) => {
    const page = e.nativeEvent.position;
    setCurrentPage(page);

    if (pages[page]?.length > 0) {
      setCurrentWord(pages[page][0].word);
      setAppState('last_position', {
        word: pages[page][0].word,
        entryNumber: pages[page][0].entry_number,
        page,
        mode: 'pages'
      });
    }

    // Preload upcoming pages if needed
    const preloadEnd = Math.min(page + PRELOAD_PAGES + 1, totalPages);
    if (preloadEnd > loadedPageRange.end + 1) {
      const newPages = await loadPageRange(loadedPageRange.end + 1, preloadEnd);
      setPages(prev => {
        const updated = [...prev];
        for (let i = 0; i < newPages.length; i++) {
          updated[loadedPageRange.end + 1 + i] = newPages[i];
        }
        return updated;
      });
      setLoadedPageRange(prev => ({ ...prev, end: preloadEnd - 1 }));
    }
  }, [pages, totalPages, loadedPageRange]);

  const goToPage = (p) => {
    if (p >= 0 && p < totalPages) {
      pagerRef.current?.setPage(p);
    }
  };

  const saveBookmark = async () => {
    if (pages[currentPage]?.length > 0) {
      const entry = pages[currentPage][0];
      await addBookmark(
        bookmarkName || `Page ${currentPage + 1}: ${entry.word}`,
        entry.entry_number,
        entry.word,
        'pages'
      );
    }
    setShowBookmarkModal(false);
    setBookmarkName('');
    Alert.alert('Saved!', `Bookmark saved at page ${currentPage + 1}`);
  };

  const styles = getStyles(c);

  if (initializing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.muted }]}>Opening page reader...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={theme.colors.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPageJump(true)} style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            Page {currentPage + 1} <Text style={{ color: c.muted }}>/ {totalPages.toLocaleString()}</Text>
          </Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowBookmarkModal(true)} style={styles.headerBtn}>
            <Ionicons name="bookmark-outline" size={20} color={c.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressTrack}>
        <View style={[
          styles.progressBar,
          {
            width: `${totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0}%`,
            backgroundColor: c.primary
          }
        ]} />
      </View>

      {/* Current word indicator */}
      <View style={[styles.wordBanner, { backgroundColor: c.highlight }]}>
        <Text style={[styles.wordBannerText, { color: c.primary }]} numberOfLines={1}>
          {currentWord}
        </Text>
      </View>

      {/* Pager */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
        orientation="horizontal"
      >
        {Array.from({ length: totalPages }, (_, pageIdx) => {
          const pageEntries = pages[pageIdx];
          return (
            <View key={pageIdx} style={styles.page}>
              {!pageEntries ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={c.primary} />
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.pageContent}
                  showsVerticalScrollIndicator={true}
                >
                  {pageEntries.map(entry => (
                    <EntryCard key={entry.id} entry={entry} compact />
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </PagerView>

      {/* Navigation Controls */}
      <View style={[styles.navBar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <TouchableOpacity
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage === 0}
          style={[styles.navNavBtn, currentPage === 0 && styles.navNavBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={22} color={currentPage === 0 ? c.muted : c.primary} />
          <Text style={[styles.navNavLabel, { color: currentPage === 0 ? c.muted : c.primary }]}>Prev</Text>
        </TouchableOpacity>

        <View style={styles.dotRow}>
          {[-2, -1, 0, 1, 2].map(offset => {
            const p = currentPage + offset;
            if (p < 0 || p >= totalPages) return <View key={offset} style={styles.dotEmpty} />;
            const isActive = offset === 0;
            return (
              <TouchableOpacity key={offset} onPress={() => goToPage(p)}>
                <View style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? c.primary : c.border,
                    width: isActive ? 20 : 8,
                  }
                ]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          style={[styles.navNavBtn, currentPage === totalPages - 1 && styles.navNavBtnDisabled]}
        >
          <Text style={[styles.navNavLabel, { color: currentPage === totalPages - 1 ? c.muted : c.primary }]}>Next</Text>
          <Ionicons name="chevron-forward" size={22} color={currentPage === totalPages - 1 ? c.muted : c.primary} />
        </TouchableOpacity>
      </View>

      {/* Bookmark Modal */}
      <Modal visible={showBookmarkModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bookmark Page {currentPage + 1}</Text>
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

      {/* Page Jump Modal */}
      <Modal visible={showPageJump} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Jump to Page</Text>
            <Text style={[styles.modalSub, { color: c.muted }]}>Enter a page number (1 – {totalPages.toLocaleString()})</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={`1 – ${totalPages}`}
              placeholderTextColor={c.muted}
              value={jumpPage}
              onChangeText={setJumpPage}
              keyboardType="number-pad"
              returnKeyType="go"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setShowPageJump(false); setJumpPage(''); }} style={styles.modalCancel}>
                <Text style={[styles.modalCancelText, { color: c.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const n = parseInt(jumpPage, 10);
                  if (!isNaN(n) && n >= 1 && n <= totalPages) {
                    goToPage(n - 1);
                  }
                  setShowPageJump(false);
                  setJumpPage('');
                }}
                style={[styles.modalSave, { backgroundColor: c.primary }]}
              >
                <Text style={styles.modalSaveText}>Go</Text>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: c.headerBg,
    borderBottomWidth: 1, borderBottomColor: c.border,
    gap: 8,
  },
  backBtn: { padding: 6, borderRadius: 10 },
  pageIndicator: {
    flex: 1, alignItems: 'center',
    paddingVertical: 6,
  },
  pageText: { fontSize: 15, fontWeight: '600', color: c.text },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surface,
  },

  progressTrack: { height: 2, backgroundColor: c.border },
  progressBar: { height: '100%' },

  wordBanner: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  wordBannerText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  pager: { flex: 1 },
  page: { flex: 1 },
  pageContent: { padding: 12, paddingBottom: 20 },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, justifyContent: 'space-between',
  },
  navNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: c.surface,
  },
  navNavBtnDisabled: { opacity: 0.4 },
  navNavLabel: { fontSize: 14, fontWeight: '600' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  dotEmpty: { width: 8 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 16 },
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
    flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12,
  },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
