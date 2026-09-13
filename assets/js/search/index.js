import { searchEntries } from "./adapters/fuse.js";

function populateSelect(select, values) {
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
    placeholder.textContent = "All";
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

function renderResults(root, results) {
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

  const count = results === null ? 0 : results.length;
  if (status) {
    const template = root.dataset.resultsTemplate || "";
    status.textContent = results === null ? "" : template.replace("{count}", String(count));
  }

  if (results === null || results.length === 0) {
    if (results !== null && results.length === 0 && status) {
      status.textContent = root.dataset.emptyMessage || "No results found";
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

    list.appendChild(item);
  });
  container.appendChild(list);
}

async function runSearch(root, index, query) {
  const results = query.trim() ? searchEntries(index, query, currentFilters(root)) : [];
  renderResults(root, results);
}

export function initSearchPage() {
  const root = document.querySelector("[data-docs-search]");
  if (!root) {
    return;
  }

  const indexUrl = root.dataset.searchIndex;
  const input = root.querySelector("[data-search-input]");
  const form = root.querySelector("[data-search-form]");
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
      loadPromise = fetch(indexUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`search index request failed: ${response.status}`);
          }
          return response.json();
        })
        .then((parsed) => {
          index = parsed;
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

          populateSelect(versionSelect, Array.from(versions));
          populateSelect(docTypeSelect, Array.from(docTypes));
          populateSelect(topicSelect, Array.from(topics));
          const currentVersion = root.dataset.searchVersion || "";
          if (versionSelect && Array.from(versionSelect.options).some((option) => option.value === currentVersion)) {
            versionSelect.value = currentVersion;
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
