/**
 * Parse Oxford Dictionary TXT format.
 * Format: "Word  n. Definition. [Etymology]"
 * or multi-word: "Proper Noun  n. Definition."
 */

const POS_ABBREVS = [
  'n\.', 'v\.', 'adj\.', 'adv\.', 'prep\.', 'conj\.', 'pron\.',
  'interj\.', 'abbr\.', 'symb\.', 'prefix', 'suffix',
  'predic\\.', 'attrib\\.', 'colloq\\.', 'archaic', 'slang',
  'naut\\.', 'gram\\.', 'brit\\.', 'us\\.', 'austral\\.', 'pl\\.',
];

const POS_REGEX = new RegExp(
  `^(${POS_ABBREVS.join('|')})`,
  'i'
);

export function parseDictionary(rawText) {
  const entries = [];
  let entryNumber = 0;

  // Normalize line endings
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) { i++; continue; }

    // Detect start of entry: line that starts with a capital letter
    // and is followed by content (not just whitespace)
    // Oxford format uses double-space between headword and definition
    const match = parseEntry(line);
    if (match) {
      entries.push({ ...match, entryNumber: entryNumber++ });
    }

    i++;
  }

  return entries;
}

function parseEntry(line) {
  // The Oxford format: "Headword  pos. Definition [etymology]"
  // Headword starts with capital. Parts of speech follow double space.
  
  // Try double-space split first
  const doubleSpaceIdx = line.indexOf('  ');
  if (doubleSpaceIdx > 0) {
    const headword = line.substring(0, doubleSpaceIdx).trim();
    const rest = line.substring(doubleSpaceIdx).trim();

    // Validate headword: should start with letter or hyphen
    if (!headword || !/^[A-Za-z\-']/.test(headword)) return null;
    // Headword shouldn't be too long (avoids parsing non-entries)
    if (headword.length > 50) return null;

    if (rest.length < 2) return null;

    return buildEntry(headword, rest);
  }

  // Single space entries that look like headwords (e.g., abbreviations)
  // Format: "ABC n. ..."
  const singleSpaceMatch = line.match(/^([A-Z][A-Za-z\-']*(?:\s+[A-Za-z][A-Za-z\-']*)*)\s+((?:n\.|v\.|adj\.|adv\.|prep\.|conj\.|abbr\.|symb\.|prefix|suffix|—|pron\.).+)$/);
  if (singleSpaceMatch) {
    const headword = singleSpaceMatch[1].trim();
    const rest = singleSpaceMatch[2].trim();
    if (headword.length <= 50) {
      return buildEntry(headword, rest);
    }
  }

  return null;
}

function buildEntry(headword, rest) {
  let partOfSpeech = null;
  let etymology = null;
  let definition = rest;

  // Extract etymology in square brackets at the end
  const etymMatch = rest.match(/\[([^\]]+)\]\s*$/);
  if (etymMatch) {
    etymology = etymMatch[1];
    definition = rest.substring(0, etymMatch.index).trim();
  }

  // Extract part of speech at the beginning
  // POS markers: n., v., adj., adv., prep., conj., pron., interj., abbr., symb.
  // Also: —n. —v. etc. (Oxford uses em-dash for sub-entries)
  const posMatch = definition.match(/^((?:—)?(?:n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.|abbr\.|symb\.|prefix|suffix)\s*(?:(?:&|,)\s*(?:n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|abbr\.))?)\s*/i);
  if (posMatch) {
    partOfSpeech = posMatch[1].replace(/^—/, '').trim();
    definition = definition.substring(posMatch[0].length).trim();
  }

  // Clean up definition
  definition = definition
    .replace(/\s+/g, ' ')
    .trim();

  if (!definition) return null;

  return {
    word: capitalizeFirst(headword),
    definition,
    partOfSpeech,
    etymology,
  };
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getSearchSuggestions(query, entries, limit = 8) {
  if (!query) return [];
  const q = query.toLowerCase();
  return entries
    .filter(e => e.word.toLowerCase().startsWith(q))
    .slice(0, limit)
    .map(e => e.word);
}
