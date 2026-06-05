import { useState, useEffect, useRef } from 'react';
import { readAsStringAsync } from "expo-file-system/legacy";
import { Asset } from 'expo-asset';
import { initDB, isIndexed, insertEntriesBatch, buildFTS, getTotalEntries, setAppState, getAppState } from '../database/db';
import { parseDictionary } from '../utils/parser';

const BATCH_SIZE = 500;
const DICT_VERSION = '1.0.0';

export const useDictionaryLoader = () => {
  const [status, setStatus] = useState('initializing'); // initializing, loading, indexing, ready, error
  const [progress, setProgress] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    loadDictionary();
    return () => { cancelRef.current = true; };
  }, []);

  const loadDictionary = async () => {
    try {
      setStatus('initializing');

      // Init DB schema
      await initDB();

      // Check if already indexed
      const storedVersion = await getAppState('dict_version');
      const alreadyIndexed = await isIndexed();

      if (alreadyIndexed && storedVersion === DICT_VERSION) {
        const count = await getTotalEntries();
        setTotalEntries(count);
        setStatus('ready');
        return;
      }

      setStatus('loading');
      setProgress(0);

      // Load the bundled asset
      const asset = Asset.fromModule(require('../../assets/dictionary/oxford_dictionary.txt'));
      await asset.downloadAsync();

      const fileUri = asset.localUri || asset.uri;
      const content = await readAsStringAsync(fileUri);

      if (cancelRef.current) return;

      setStatus('indexing');
      setProgress(10);

      // Parse all entries
      const entries = parseDictionary(content);
      const total = entries.length;

      setProgress(20);

      // Batch insert into SQLite
      let inserted = 0;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        if (cancelRef.current) return;
        const batch = entries.slice(i, i + BATCH_SIZE);
        await insertEntriesBatch(batch);
        inserted += batch.length;
        const pct = 20 + Math.floor((inserted / total) * 65);
        setProgress(pct);
      }

      setProgress(85);

      // Build FTS index
      await buildFTS().catch(() => {}); // non-fatal if FTS fails
      setProgress(95);

      // Mark as indexed
      await setAppState('dict_version', DICT_VERSION);
      await setAppState('total_entries', total);

      const count = await getTotalEntries();
      setTotalEntries(count);
      setProgress(100);
      setStatus('ready');

    } catch (err) {
      console.error('Dictionary load error:', err);
      setError(err.message || 'Failed to load dictionary');
      setStatus('error');
    }
  };

  const retry = () => {
    setError(null);
    loadDictionary();
  };

  return { status, progress, totalEntries, error, retry };
};
