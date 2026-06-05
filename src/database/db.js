import * as SQLite from 'expo-sqlite';

let db = null;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('oxford_dict.db');
  }
  return db;
};

export const initDB = async () => {
  const database = await getDB();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      word_lower TEXT NOT NULL,
      definition TEXT NOT NULL,
      part_of_speech TEXT,
      etymology TEXT,
      entry_number INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_word_lower ON entries(word_lower);
    CREATE INDEX IF NOT EXISTS idx_word ON entries(word);
    CREATE INDEX IF NOT EXISTS idx_entry_number ON entries(entry_number);

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      definition TEXT NOT NULL,
      part_of_speech TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      entry_number INTEGER NOT NULL,
      word TEXT NOT NULL,
      mode TEXT DEFAULT 'continuous',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
      word, definition, content='entries', content_rowid='id'
    );
  `);

  return database;
};

export const isIndexed = async () => {
  const database = await getDB();
  try {
    const result = await database.getFirstAsync('SELECT COUNT(*) as count FROM entries');
    return result?.count > 0;
  } catch {
    return false;
  }
};

export const insertEntriesBatch = async (entries) => {
  const database = await getDB();
  await database.withTransactionAsync(async () => {
    const stmt = await database.prepareAsync(
      'INSERT OR IGNORE INTO entries (word, word_lower, definition, part_of_speech, etymology, entry_number) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const e of entries) {
      await stmt.executeAsync([
        e.word, e.word.toLowerCase(), e.definition,
        e.partOfSpeech || null, e.etymology || null, e.entryNumber
      ]);
    }
    await stmt.finalizeAsync();
  });
};

export const buildFTS = async () => {
  const database = await getDB();
  await database.execAsync(`
    INSERT INTO entries_fts(rowid, word, definition)
    SELECT id, word, definition FROM entries;
  `);
};

export const getTotalEntries = async () => {
  const database = await getDB();
  const r = await database.getFirstAsync('SELECT COUNT(*) as count FROM entries');
  return r?.count || 0;
};

export const searchEntries = async (query, limit = 50) => {
  const database = await getDB();
  if (!query || query.trim().length === 0) return [];

  const q = query.toLowerCase().trim();

  // Prefix match first, then partial, then FTS
  const exact = await database.getAllAsync(
    'SELECT * FROM entries WHERE word_lower = ? LIMIT 5',
    [q]
  );

  const prefix = await database.getAllAsync(
    'SELECT * FROM entries WHERE word_lower LIKE ? AND word_lower != ? LIMIT 20',
    [q + '%', q]
  );

  const partial = await database.getAllAsync(
    'SELECT * FROM entries WHERE word_lower LIKE ? AND word_lower NOT LIKE ? LIMIT 15',
    ['%' + q + '%', q + '%']
  );

  const defSearch = await database.getAllAsync(
    `SELECT e.* FROM entries_fts fts 
     JOIN entries e ON e.id = fts.rowid 
     WHERE fts.definition MATCH ? LIMIT 10`,
    [q + '*']
  ).catch(() => []);

  const seen = new Set();
  const results = [];
  for (const row of [...exact, ...prefix, ...partial, ...defSearch]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      results.push(row);
      if (results.length >= limit) break;
    }
  }
  return results;
};

export const getEntriesPaginated = async (offset, limit) => {
  const database = await getDB();
  return database.getAllAsync(
    'SELECT * FROM entries ORDER BY entry_number LIMIT ? OFFSET ?',
    [limit, offset]
  );
};

export const getEntryById = async (id) => {
  const database = await getDB();
  return database.getFirstAsync('SELECT * FROM entries WHERE id = ?', [id]);
};

// Favorites
export const addFavorite = async (entry) => {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO favorites (word, definition, part_of_speech) VALUES (?, ?, ?)',
    [entry.word, entry.definition, entry.part_of_speech || null]
  );
};

export const removeFavorite = async (word) => {
  const database = await getDB();
  await database.runAsync('DELETE FROM favorites WHERE word = ?', [word]);
};

export const isFavorite = async (word) => {
  const database = await getDB();
  const r = await database.getFirstAsync('SELECT id FROM favorites WHERE word = ?', [word]);
  return !!r;
};

export const getFavorites = async () => {
  const database = await getDB();
  return database.getAllAsync('SELECT * FROM favorites ORDER BY created_at DESC');
};

export const getFavoritesCount = async () => {
  const database = await getDB();
  const r = await database.getFirstAsync('SELECT COUNT(*) as count FROM favorites');
  return r?.count || 0;
};

export const searchFavorites = async (query) => {
  const database = await getDB();
  const q = '%' + query.toLowerCase() + '%';
  return database.getAllAsync(
    'SELECT * FROM favorites WHERE LOWER(word) LIKE ? OR LOWER(definition) LIKE ? ORDER BY created_at DESC',
    [q, q]
  );
};

// Bookmarks
export const addBookmark = async (name, entryNumber, word, mode = 'continuous') => {
  const database = await getDB();
  await database.runAsync(
    'INSERT INTO bookmarks (name, entry_number, word, mode) VALUES (?, ?, ?, ?)',
    [name || `Bookmark: ${word}`, entryNumber, word, mode]
  );
};

export const getBookmarks = async () => {
  const database = await getDB();
  return database.getAllAsync('SELECT * FROM bookmarks ORDER BY created_at DESC');
};

export const removeBookmark = async (id) => {
  const database = await getDB();
  await database.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
};

// App state
export const setAppState = async (key, value) => {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)',
    [key, JSON.stringify(value)]
  );
};

export const getAppState = async (key, defaultValue = null) => {
  const database = await getDB();
  const r = await database.getFirstAsync('SELECT value FROM app_state WHERE key = ?', [key]);
  if (!r) return defaultValue;
  try { return JSON.parse(r.value); } catch { return r.value; }
};
