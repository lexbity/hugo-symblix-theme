const DIACRITICS_RE = /[\u0300-\u036f]/g;
const SPLIT_RE = /[\s/._-]+/;

function normalizeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  try {
    return String(value).normalize("NFD").replace(DIACRITICS_RE, "").toLowerCase().trim();
  } catch {
    return String(value).toLowerCase().trim();
  }
}

function tokenize(value) {
  return normalizeText(value).split(SPLIT_RE).filter(Boolean);
}

function includesAll(haystack, tokens) {
  return tokens.every((token) => haystack.includes(token));
}

function matchesTopic(entryTopics, topic) {
  if (!topic) {
    return true;
  }

  return Array.isArray(entryTopics) && entryTopics.some((entryTopic) => normalizeText(entryTopic) === topic);
}

function fieldValue(entry) {
  return [
    entry.title,
    entry.description,
    entry.content,
    entry.version,
    entry.docType,
    ...(Array.isArray(entry.topics) ? entry.topics : []),
  ]
    .map(normalizeText)
    .join(" ");
}

function scoreEntry(entry, query, tokens) {
  const haystack = fieldValue(entry);
  if (!includesAll(haystack, tokens)) {
    return -1;
  }

  let score = 0;
  const title = normalizeText(entry.title);
  const description = normalizeText(entry.description);
  const content = normalizeText(entry.content);
  const docType = normalizeText(entry.docType);
  const version = normalizeText(entry.version);
  const topics = Array.isArray(entry.topics) ? entry.topics.map(normalizeText).join(" ") : "";

  if (title === query) {
    score += 1000;
  }

  if (title.includes(query)) {
    score += 500;
  }

  if (includesAll(title, tokens)) {
    score += 250;
  }

  if (includesAll(description, tokens)) {
    score += 120;
  }

  if (includesAll(topics, tokens)) {
    score += 80;
  }

  if (includesAll(docType, tokens)) {
    score += 40;
  }

  if (includesAll(version, tokens)) {
    score += 30;
  }

  if (includesAll(content, tokens)) {
    score += 20;
  }

  return score;
}

function matchesFilters(entry, filters) {
  if (filters.version && entry.version !== filters.version) {
    return false;
  }

  if (filters.docType && normalizeText(entry.docType) !== filters.docType) {
    return false;
  }

  if (!matchesTopic(entry.topics, filters.topic)) {
    return false;
  }

  return true;
}

export function searchEntries(entries, query, filters = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const tokens = tokenize(normalizedQuery);
  if (!tokens.length) {
    return [];
  }

  return entries
    .filter((entry) => matchesFilters(entry, filters))
    .map((entry) => {
      const score = scoreEntry(entry, normalizedQuery, tokens);
      return score >= 0 ? { ...entry, score } : null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.title.localeCompare(right.title);
    });
}
