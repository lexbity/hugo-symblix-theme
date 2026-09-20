import { searchEntries, precomputeEntries } from "./adapters/matcher.js";

function populateSelect(select, values, allLabel) {
  if (!select) {
    return;
  }
  Array.from(select.options).forEach((option) => {
    if (option.value) {
      select.removeChild(option);
    }
  });
  values
    .sort((left, right) => left.localeCompare(right))
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  if (values.length > 0) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = allLabel || "All";
    select.insertBefore(placeholder, select.firstChild);
    select.value = "";
  }
}

function currentFilters(root) {
  const version = root.querySelector("[data-search-filter-version]");
  const docType = root.querySelector("[data-search-filter-doctype]");
  const topic = root.querySelector("[data-search-filter-topic]");
  return {
    version: version ? version.value : "",
    docType: docType ? docType.value : "",
    topic: topic ? topic.value : "",
  };
}

const SNIPPET_BEFORE = 60;
const SNIPPET_AFTER = 100;

function buildSnippet(content, query) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return null;
  }

  const firstToken = String(query || "").trim().split(/\s+/)[0];
  if (!firstToken) {
    return { before: text.slice(0, SNIPPET_BEFORE + SNIPPET_AFTER), match: "", after: "" };
  }

  const at = text.toLowerCase().indexOf(firstToken.toLowerCase());
  if (at < 0) {
    return { before: text.slice(0, SNIPPET_BEFORE + SNIPPET_AFTER), match: "", after: "" };
  }

  const start = Math.max(0, at - SNIPPET_BEFORE);
  const end = Math.min(text.length, at + firstToken.length + SNIPPET_AFTER);
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, at),
    match: text.slice(at, at + firstToken.length),
    after: text.slice(at + firstToken.length, end) + (end < text.length ? "…" : ""),
  };
}

function appendSnippet(item, entry, query) {
  const snippet = buildSnippet(entry.content, query);
  if (!snippet || (!snippet.match && !snippet.before && !snippet.after)) {
    return;
  }

  const paragraph = document.createElement("p");
  paragraph.className = "docs-search-result-snippet";
  if (snippet.before) {
    paragraph.appendChild(document.createTextNode(snippet.before));
  }
  if (snippet.match) {
    const mark = document.createElement("mark");
    mark.textContent = snippet.match;
    paragraph.appendChild(mark);
  }
  if (snippet.after) {
    paragraph.appendChild(document.createTextNode(snippet.after));
  }
  item.appendChild(paragraph);
}

function renderResults(root, results, query) {
  const container = root.querySelector("[data-search-results]");
  const status = root.querySelector("[data-search-status]");
  const fallback = root.querySelector("[data-search-fallback]");
  if (!container) {
    return;
  }

  if (fallback) {
    fallback.hidden = results !== null;
  }

  container.textContent = "";
  if (results !== null) {
    container.hidden = false;
  }

  // Update results container aria-label with query
  if (query && results !== null) {
    const resultsHeading = root.dataset.resultsHeading || "Results for";
    container.setAttribute("aria-label", `${resultsHeading} ${query}`);
  }

  const count = results === null ? 0 : results.length;
  if (status) {
    const template = root.dataset.resultsTemplate || "";
    status.textContent = results === null ? "" : template.replace("{count}", String(count));
  }

  if (results === null || results.length === 0) {
    if (results !== null && results.length === 0 && status) {
      const emptyMessage = root.dataset.emptyMessage || "No results found";
      status.textContent = emptyMessage;
    }
    return;
  }

  const list = document.createElement("ul");
  list.className = "docs-search-results-list";
  results.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "docs-search-result";

    const link = document.createElement("a");
    link.className = "docs-search-result-link";
    link.href = entry.url;
    link.textContent = entry.title;
    item.appendChild(link);

    if (entry.description) {
      const description = document.createElement("p");
      description.className = "docs-search-result-description";
      description.textContent = entry.description;
      item.appendChild(description);
    }

    const meta = [entry.version, entry.docType]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    if (meta.length > 0) {
      const metaLine = document.createElement("p");
      metaLine.className = "docs-search-result-meta";
      metaLine.textContent = meta.join(" · ");
      item.appendChild(metaLine);
    }

    appendSnippet(item, entry, query);

    list.appendChild(item);
  });
  container.appendChild(list);
}

async function runSearch(root, index, query) {
  const results = query.trim() ? searchEntries(index, query, currentFilters(root)) : [];
  renderResults(root, results, query);
}

export function initSearchPage() {
  const root = document.querySelector("[data-docs-search]");
  if (!root) {
    return;
  }

  const indexUrl = root.dataset.searchIndex;
  const input = root.querySelector("[data-search-input]");
  const form = root.querySelector("[data-search-form]");
  const clearBtn = root.querySelector("[data-search-clear]");
  if (!indexUrl || !input || !form) {
    return;
  }

  let index = null;
  let loadPromise = null;
  const ensureIndex = () => {
    if (index) {
      return Promise.resolve(index);
    }
    if (!loadPromise) {
      // Show loading state
      const status = root.querySelector("[data-search-status]");
      if (status && root.dataset.loadingMessage) {
        status.textContent = root.dataset.loadingMessage;
      }

      loadPromise = fetch(indexUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`search index request failed: ${response.status}`);
          }
          return response.json();
        })
        .then((parsed) => {
          // Precompute haystacks for faster search
          index = precomputeEntries(parsed);

          const versionSelect = root.querySelector("[data-search-filter-version]");
          const docTypeSelect = root.querySelector("[data-search-filter-doctype]");
          const topicSelect = root.querySelector("[data-search-filter-topic]");

          const versions = new Set();
          const docTypes = new Set();
          const topics = new Set();
          index.forEach((entry) => {
            if (entry.version) {
              versions.add(entry.version);
            }
            if (entry.docType) {
              docTypes.add(entry.docType);
            }
            (entry.topics || []).forEach((topic) => topics.add(topic));
          });

          populateSelect(versionSelect, Array.from(versions), versionSelect?.dataset.allVersions);
          populateSelect(docTypeSelect, Array.from(docTypes), docTypeSelect?.dataset.allTypes);
          populateSelect(topicSelect, Array.from(topics), topicSelect?.dataset.allTopics);

          const filters = root.querySelector("[data-search-filters]");
          if (filters) {
            filters.hidden = false;
          }
          const currentVersion = root.dataset.searchVersion || "";
          if (versionSelect && Array.from(versionSelect.options).some((option) => option.value === currentVersion)) {
            versionSelect.value = currentVersion;
          }

          // Show empty hint after index loads
          const emptyHint = root.dataset.emptyHint || "";
          if (status && emptyHint) {
            status.textContent = emptyHint;
          }

          return index;
        })
        .catch((error) => {
          loadPromise = null;
          const status = root.querySelector("[data-search-status]");
          if (status) {
            status.textContent = root.dataset.errorMessage || "Search failed";
          }
          throw error;
        });
    }
    return loadPromise;
  };

  let debounceTimer = null;
  const scheduleSearch = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      ensureIndex()
        .then((loaded) => runSearch(root, loaded, input.value))
        .catch(() => {});
    }, 150);
  };

  input.addEventListener("input", scheduleSearch);
  input.addEventListener("focus", () => {
    ensureIndex().catch(() => {});
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ensureIndex()
      .then((loaded) => runSearch(root, loaded, input.value))
      .catch(() => {});
  });

  // Clear button handler
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      const container = root.querySelector("[data-search-results]");
      const status = root.querySelector("[data-search-status]");
      const fallback = root.querySelector("[data-search-fallback]");
      if (container) {
        container.textContent = "";
        container.hidden = true;
      }
      if (status) {
        const emptyHint = root.dataset.emptyHint || "";
        status.textContent = emptyHint;
      }
      if (fallback) {
        fallback.hidden = false;
      }
      input.focus();
    });
  }

  root.querySelectorAll("select[data-search-filter]").forEach((select) => {
    select.addEventListener("change", scheduleSearch);
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    input.value = initialQuery;
    ensureIndex()
      .then((loaded) => runSearch(root, loaded, initialQuery))
      .catch(() => {});
  }
}