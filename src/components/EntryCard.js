import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Share, Clipboard, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { addFavorite, removeFavorite, isFavorite } from '../database/db';

export default function EntryCard({ entry, style, showActions = true, compact = false }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (entry?.word) {
      isFavorite(entry.word).then(setFav);
    }
  }, [entry?.word]);

  const toggleFavorite = useCallback(async () => {
    if (!entry) return;
    if (fav) {
      await removeFavorite(entry.word);
      setFav(false);
    } else {
      await addFavorite(entry);
      setFav(true);
    }
  }, [fav, entry]);

  const copyEntry = useCallback(() => {
    if (!entry) return;
    const text = `${entry.word}${entry.part_of_speech ? ` (${entry.part_of_speech})` : ''}: ${entry.definition}`;
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [entry]);

  const shareEntry = useCallback(() => {
    if (!entry) return;
    const text = `${entry.word}: ${entry.definition}`;
    Share.share({ message: text, title: entry.word });
  }, [entry]);

  if (!entry) return null;

  const styles = getStyles(c, compact);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.wordRow}>
          <Text style={styles.word} selectable>{entry.word}</Text>
          {entry.part_of_speech ? (
            <View style={styles.posBadge}>
              <Text style={styles.posText}>{entry.part_of_speech}</Text>
            </View>
          ) : null}
        </View>

        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={copyEntry} style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? c.accent : c.muted}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareEntry} style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={18} color={c.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons
                name={fav ? 'heart' : 'heart-outline'}
                size={18}
                color={fav ? c.favActive : c.muted}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.definition} selectable>
        {entry.definition}
      </Text>

      {entry.etymology && !compact && (
        <Text style={styles.etymology} selectable>
          {entry.etymology}
        </Text>
      )}
    </View>
  );
}

const getStyles = (c, compact) => StyleSheet.create({
  card: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: compact ? 14 : 18,
    marginBottom: compact ? 8 : 12,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: compact ? 6 : 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 8,
  },
  word: {
    fontSize: compact ? 17 : 20,
    fontWeight: '700',
    color: c.wordTitle,
    letterSpacing: -0.3,
  },
  posBadge: {
    backgroundColor: c.badge,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  posText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.badgeText,
    textTransform: 'lowercase',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 8,
  },
  definition: {
    fontSize: compact ? 13 : 15,
    color: c.text,
    lineHeight: compact ? 20 : 24,
  },
  etymology: {
    marginTop: 10,
    fontSize: 12,
    color: c.muted,
    fontStyle: 'italic',
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: c.divider,
    paddingTop: 8,
  },
});
